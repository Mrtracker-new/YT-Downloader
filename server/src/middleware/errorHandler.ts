import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import crypto from 'crypto';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate request ID for tracking if not already present
  const requestId = (req as any).id || crypto.randomBytes(8).toString('hex');

  // Log full error details internally (never sent to client)
  logger.error('Error occurred', {
    requestId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Get status code from error or default to 500
  const statusCode = (err as any).statusCode || 500;

  // Send sanitized response - NEVER leak sensitive information
  res.status(statusCode).json({
    success: false,
    error: isProduction
      ? 'An error occurred while processing your request'
      : err.message, // Only show detail in development
    requestId, // For support tracking
    timestamp: new Date().toISOString()
  });
};
