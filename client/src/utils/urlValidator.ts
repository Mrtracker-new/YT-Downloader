/**
 * Client-side YouTube URL validation
 * Provides instant feedback without API calls
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  videoId?: string;
}

/**
 * Extract video ID from YouTube URL
 */
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Validate YouTube URL format (client-side only)
 */
export const validateYouTubeUrl = (url: string): ValidationResult => {
  // Check if empty
  if (!url || !url.trim()) {
    return {
      isValid: false,
      error: 'Please enter a URL',
    };
  }

  const trimmedUrl = url.trim();

  // Check if it looks like a URL
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return {
      isValid: false,
      error: 'URL must start with http:// or https://',
    };
  }

  // Check if it's a YouTube domain
  const youtubePatterns = [
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//,
    /^https?:\/\/(m\.)?(youtube\.com)\//,
  ];

  const isYouTubeDomain = youtubePatterns.some(pattern => pattern.test(trimmedUrl));
  if (!isYouTubeDomain) {
    return {
      isValid: false,
      error: 'URL must be from YouTube (youtube.com or youtu.be)',
    };
  }

  // Extract and validate video ID
  const videoId = extractVideoId(trimmedUrl);
  if (!videoId) {
    return {
      isValid: false,
      error: 'Could not find video ID in URL. Please check the URL format.',
    };
  }

  // Check for playlist URLs (warn user)
  if (trimmedUrl.includes('list=')) {
    return {
      isValid: true,
      videoId,
      error: 'Note: Playlist detected. Only the current video will be processed.',
    };
  }

  return {
    isValid: true,
    videoId,
  };
};

/**
 * Format URL to canonical form
 */
export const normalizeYouTubeUrl = (url: string): string => {
  const videoId = extractVideoId(url);
  if (!videoId) return url;
  
  return `https://www.youtube.com/watch?v=${videoId}`;
};
