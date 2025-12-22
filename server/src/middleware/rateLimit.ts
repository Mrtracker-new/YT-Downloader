import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for resource-intensive operations
 * (downloading, fetching video info)
 */
export const strictRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'), // 10 requests per minute
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Lenient rate limiter for lightweight operations
 * (validation, queue status checks)
 */
export const lenientRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: 100, // Much higher limit for lightweight operations
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * No rate limiting for streaming endpoints
 * (SSE progress streams, file downloads)
 * These are long-lived connections, not request spam
 */
export const noRateLimit = (req: any, res: any, next: any) => next();

/**
 * Strict rate limiter for download endpoints
 */
export const downloadRateLimit = rateLimit({
  windowMs: 3600000, // 1 hour
  max: parseInt(process.env.DOWNLOAD_RATE_LIMIT_MAX || '10'), // 10 downloads per hour
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'Download limit reached. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for streaming endpoints
 */
export const streamRateLimit = rateLimit({
  windowMs: parseInt(process.env.STREAM_RATE_LIMIT_WINDOW || '300000'), // 5 minutes
  max: parseInt(process.env.STREAM_RATE_LIMIT_MAX || '5'), // 5 streams per 5 minutes
  message: {
    success: false,
    error: 'Streaming limit reached. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Default export for backward compatibility
export const rateLimiter = lenientRateLimiter;
