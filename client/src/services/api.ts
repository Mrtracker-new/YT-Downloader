import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90 seconds - increased for large videos
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  // Enable HTTP keep-alive for connection reuse
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 500,
});

// Request cache for deduplication
const requestCache = new Map<string, Promise<any>>();
const cacheTimeout = 5000; // Cache identical requests for 5 seconds

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: string;
  thumbnail: string;
  description: string;
  formats: VideoFormat[];
  availableQualities?: string[]; // Actual available video qualities
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
 * Get quick video preview (faster, minimal data)
 */
export const getQuickVideoInfo = async (url: string): Promise<Partial<VideoInfo>> => {
  const cacheKey = `quick:${url}`;

  // Check if there's already a pending request for this URL
  const cached = requestCache.get(cacheKey);
  if (cached) {
    console.log('⚡ Returning cached quick preview for:', url);
    return cached;
  }

  // Create new request and cache it
  const requestPromise = api.post<ApiResponse<Partial<VideoInfo>>>('/api/video/quick-info', { url })
    .then(response => {
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch quick video info');
      }
      return response.data.data;
    })
    .finally(() => {
      // Remove from cache after timeout
      setTimeout(() => requestCache.delete(cacheKey), cacheTimeout);
    });

  requestCache.set(cacheKey, requestPromise);
  return requestPromise;
};

/**
 * Get video information with request deduplication
 */
export const getVideoInfo = async (url: string): Promise<VideoInfo> => {
  const cacheKey = `info:${url}`;

  // Check if there's already a pending request for this URL
  const cached = requestCache.get(cacheKey);
  if (cached) {
    console.log('⚡ Returning cached/pending request for:', url);
    return cached;
  }

  // Create new request and cache it
  const requestPromise = api.post<ApiResponse<VideoInfo>>('/api/video/info', { url })
    .then(response => {
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch video info');
      }
      return response.data.data;
    })
    .finally(() => {
      // Remove from cache after timeout
      setTimeout(() => requestCache.delete(cacheKey), cacheTimeout);
    });

  requestCache.set(cacheKey, requestPromise);
  return requestPromise;
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
  onProgress?: (progress: { progress: number; speed: string; eta: string; done?: boolean; status?: string }) => void
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

    // Step 4: Wait for file to be fully ready (merged)
    // yt-dlp may still be merging fragments even after progress shows 100%
    console.log('Waiting for file to be fully processed...');

    const maxRetries = 10;
    let retries = 0;
    let fileReady = false;

    while (retries < maxRetries && !fileReady) {
      try {
        // Check if file is ready by making a HEAD request  
        const checkResponse = await api.head(`/api/video/file/${downloadId}`);

        // If we get a 200, file is ready
        if (checkResponse.status === 200) {
          fileReady = true;
          console.log('File is ready for download!');
          break;
        }
      } catch (error: any) {
        // 202 means still processing, wait and retry
        if (error.response?.status === 202) {
          console.log(`File still processing, retry ${retries + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          retries++;
        } else {
          // Other errors, break and try to download anyway
          console.warn('Error checking file status:', error.message);
          break;
        }
      }
    }

    // Step 5: Trigger download
    console.log(`Triggering download: ${API_BASE_URL}/api/video/file/${downloadId}`);

    // Create a temporary link to force download
    // We can't use window.location.href directly efficiently for tracking completion,
    // but since we already waited for progress to complete, the file is ready.
    const downloadUrl = `${API_BASE_URL}/api/video/file/${downloadId}`;

    // Create invisible iframe or link to trigger download without navigation
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename); // Hint filename
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
    }, 1000);

    return; // Done
  } catch (error) {
    console.error('Download error details:', error);
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.error || error.message || 'Download failed';
      throw new Error(errorMsg);
    }
    throw error;
  }
};

/**
 * Wake up the server (useful for Render free tier)
 */
export const wakeServer = async (): Promise<{ status: string; timestamp: string }> => {
  try {
    const response = await api.get<{ status: string; timestamp: string }>('/health', {
      timeout: 90000, // 90 seconds - Render cold starts can take 60+ seconds
    });

    // Check if response is successful and has expected data
    if (response.status === 200 && response.data) {
      return response.data;
    }

    throw new Error('Server returned unexpected response');
  } catch (error) {
    console.error('Wake server error:', error);

    if (axios.isAxiosError(error)) {
      // Network error (server is offline or unreachable)
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || !error.response) {
        throw new Error('Cannot connect to server. It may be waking up - try again in 10-20 seconds!');
      }

      // Timeout error - server is waking up but taking longer than expected
      if (error.code === 'ECONNABORTED') {
        throw new Error('Server is waking up but taking longer than expected. Try clicking again in 10 seconds!');
      }

      // HTTP error status codes
      if (error.response) {
        throw new Error(`Server error: ${error.response.status} ${error.response.statusText}`);
      }
    }

    throw new Error('Failed to wake server');
  }
};

export default api;
