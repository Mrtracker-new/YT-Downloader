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

// Default export for backward compatibility
export const rateLimiter = lenientRateLimiter;
