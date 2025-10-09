import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds - allows time for cookie authentication with YouTube
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: string;
  thumbnail: string;
  description: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  itag: number;
  quality: string;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  qualityLabel?: string;
  audioQuality?: string;
  contentLength?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get video information
 */
export const getVideoInfo = async (url: string): Promise<VideoInfo> => {
  const response = await api.post<ApiResponse<VideoInfo>>('/api/video/info', { url });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch video info');
  }
  return response.data.data;
};

/**
 * Validate YouTube URL
 */
export const validateUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await api.post<ApiResponse<{ valid: boolean }>>('/api/video/validate', { url });
    return response.data.data?.valid || false;
  } catch (error) {
    return false;
  }
};

/**
 * Get quality options for a video
 */
export const getQualityOptions = async (url: string) => {
  const response = await api.post<ApiResponse<{ videoQualities: string[]; audioQualities: string[] }>>(
    '/api/video/qualities',
    { url }
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to fetch quality options');
  }
  return response.data.data;
};

/**
 * Download video with progress tracking
 */
export const downloadVideo = async (
  url: string, 
  quality: string, 
  audioOnly: boolean,
  onProgress?: (progress: { progress: number; speed: string; eta: string; done?: boolean }) => void
): Promise<void> => {
  try {
    // Step 1: Start the download and get download ID
    const startResponse = await api.post<ApiResponse<{ downloadId: string; filename: string }>>(
      '/api/video/download',
      { url, quality, audioOnly }
    );

    console.log('Start response:', startResponse.data);

    if (!startResponse.data.success || !startResponse.data.data) {
      const errorMsg = startResponse.data.error || 'Failed to start download';
      console.error('Download start failed:', errorMsg);
      throw new Error(errorMsg);
    }

    const { downloadId, filename } = startResponse.data.data;
    console.log('Download started:', downloadId, filename);

    // Step 2: Track progress via SSE
    let progressComplete = false;

    if (onProgress) {
      const eventSource = new EventSource(`${API_BASE_URL}/api/video/progress/${downloadId}`);
      let lastProgressTime = Date.now();
      
      eventSource.onopen = () => {
        console.log('✅ Progress tracking connected');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data);
          lastProgressTime = Date.now();
          onProgress(progressData);
          
          if (progressData.progress >= 100 || progressData.done) {
            console.log('✅ Download complete');
            progressComplete = true;
            eventSource.close();
          }
        } catch (error) {
          console.error('❌ Progress parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        // Check if we received the completion signal
        if (progressComplete) {
          eventSource.close();
          return;
        }
        
        // Check if we haven't received updates for a while but might be complete
        const timeSinceLastUpdate = Date.now() - lastProgressTime;
        if (timeSinceLastUpdate > 5000) {
          console.log('⚠️ Connection lost, checking completion status...');
          progressComplete = true;
          eventSource.close();
          return;
        }
        
        console.error('❌ Connection error:', error);
        // Don't immediately fail - the download might still be in progress
        // The polling mechanism below will handle checking completion
      };
      
      // Fallback: Close after 10 minutes
      setTimeout(() => {
        eventSource.close();
        progressComplete = true; // Force completion on timeout
      }, 600000);

      // Step 3: Wait for download to complete
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (progressComplete) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100); // Check every 100ms for faster response
      });
    } else {
      // If no progress callback, just poll until download is done
      console.log('No progress callback, polling for completion...');
      await new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/api/video/progress/${downloadId}`);
            const reader = statusResponse.body?.getReader();
            if (reader) {
              const { value } = await reader.read();
              if (value) {
                const text = new TextDecoder().decode(value);
                const match = text.match(/data: ({.*})/);
                if (match) {
                  const progressData = JSON.parse(match[1]);
                  console.log('Polling progress:', progressData.progress);
                  if (progressData.progress >= 100 || progressData.done) {
                    reader.cancel();
                    clearInterval(checkInterval);
                    resolve(true);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }, 2000);
      });
    }

    // Give the server a moment to finalize the file write
    console.log('Download complete, waiting 2 seconds before retrieval...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Retrieve the downloaded file
    const fileResponse = await fetch(`${API_BASE_URL}/api/video/file/${downloadId}`);
    
    if (!fileResponse.ok) {
      throw new Error('Failed to retrieve file');
    }

    // Get the blob from response
    const blob = await fileResponse.blob();

    // Extract filename from Content-Disposition header
    const contentDisposition = fileResponse.headers.get('content-disposition');
    let downloadFilename = filename; // Use filename from initial response
    
    console.log('Content-Disposition header:', contentDisposition);
    console.log('Filename from initial response:', filename);
    
    if (contentDisposition) {
      // Try to extract RFC 5987 format first (filename*=UTF-8''...)
      const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/);
      if (rfc5987Match && rfc5987Match[1]) {
        downloadFilename = decodeURIComponent(rfc5987Match[1]);
      } else {
        // Fallback to standard format (filename="...")
        const standardMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (standardMatch && standardMatch[1]) {
          downloadFilename = standardMatch[1];
        }
      }
    }
    
    console.log('Final filename to download:', downloadFilename);

    // Create download link and trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download error details:', error);
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.error || error.message || 'Download failed';
      console.error('Axios error:', errorMsg, error.response?.data);
      throw new Error(errorMsg);
    }
    if (error instanceof Error) {
      throw new Error(error.message || 'Download failed');
    }
    throw new Error('Download failed');
  }
};

export default api;
