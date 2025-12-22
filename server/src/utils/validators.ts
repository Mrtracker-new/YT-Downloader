import Joi from 'joi';
import crypto from 'crypto';
import { resolve, normalize, sep } from 'path';
import sanitize from 'sanitize-filename';
import logger from '../utils/logger';

/**
 * URL Validator - Prevents SSRF and injection attacks
 */
export class UrlValidator {
  private static readonly ALLOWED_DOMAINS = [
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'm.youtube.com'
  ];

  private static readonly BLOCKED_IP_PATTERNS = [
    /^127\./, // Localhost
    /^10\./, // Private 10.x
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private 172.16-31
    /^192\.168\./, // Private 192.168
    /^169\.254\./, // Link-local
    /^::1$/, // IPv6 localhost
    /^fc/, // IPv6 private
    /^fe80/ // IPv6 link-local
  ];

  /**
   * Validate and sanitize YouTube URL
   */
  static validate(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    // Remove whitespace
    url = url.trim();

    // Parse URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP/HTTPS protocols are allowed');
    }

    // Check domain
    if (!this.ALLOWED_DOMAINS.includes(parsed.hostname.toLowerCase())) {
      throw new Error('Only YouTube URLs are allowed');
    }

    // Prevent IP-based URLs
    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      throw new Error('IP addresses are not allowed');
    }

    // Prevent IPv6 URLs
    if (parsed.hostname.includes(':')) {
      throw new Error('IPv6 addresses are not allowed');
    }

    // Additional security: ensure no shell metacharacters
    const dangerous = /[;<>|&$`\\!]/;
    if (dangerous.test(url)) {
      throw new Error('URL contains invalid characters');
    }

    logger.info('URL validation successful', {
      hostname: parsed.hostname,
      protocol: parsed.protocol
    });

    return url;
  }

  /**
   * Sanitize URL for logging (remove sensitive parts)
   */
  static sanitizeForLogging(url: string): string {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/');
      return `${parsed.hostname}/${pathParts[1]}/[VIDEO_ID]`;
    } catch {
      return '[INVALID_URL]';
    }
  }
}

/**
 * Path Validator - Prevents path traversal attacks
 */
export class PathValidator {
  /**
   * Validate that a path is within allowed directory
   */
  static validatePath(filePath: string, allowedDir: string): string {
    // Normalize and resolve paths
    const normalizedPath = normalize(resolve(filePath));
    const normalizedAllowedDir = normalize(resolve(allowedDir));

    // Check if path is within allowed directory
    if (!normalizedPath.startsWith(normalizedAllowedDir + sep) &&
      normalizedPath !== normalizedAllowedDir) {
      logger.error('Path traversal attempt detected', {
        requestedPath: filePath,
        normalizedPath,
        allowedDir: normalizedAllowedDir
      });
      throw new Error('Access denied: Path traversal detected');
    }

    return normalizedPath;
  }

  /**
   * Validate download ID format (alphanumeric and hyphens only)
   */
  static validateDownloadId(downloadId: string): string {
    if (!downloadId || typeof downloadId !== 'string') {
      throw new Error('Download ID is required');
    }

    // Only allow alphanumeric characters and hyphens
    if (!/^[a-zA-Z0-9\-]+$/.test(downloadId)) {
      throw new Error('Invalid download ID format');
    }

    // Reasonable length limit
    if (downloadId.length > 100) {
      throw new Error('Download ID too long');
    }

    return downloadId;
  }
}

/**
 * Filename Validator - Secure filename generation
 */
export class FilenameValidator {
  private static readonly ALLOWED_EXTENSIONS = ['mp4', 'mp3', 'webm'];

  /**
   * Create safe filename from title and extension
   */
  static createSafeFilename(title: string, extension: string): string {
    // Validate extension
    const lowerExt = extension.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(lowerExt)) {
      throw new Error(`Invalid file extension: ${extension}`);
    }

    // Sanitize title - remove all special characters including dots
    const safeTitle = sanitize(title)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit length

    if (!safeTitle) {
      throw new Error('Invalid filename: sanitization resulted in empty string');
    }

    // Ensure single extension
    return `${safeTitle}.${lowerExt}`;
  }
}

/**
 * Secure ID Generator
 */
export class IdGenerator {
  /**
   * Generate cryptographically secure download ID
   */
  static generateDownloadId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure API key
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Joi Validation Schemas
 */
export const downloadSchema = Joi.object({
  url: Joi.string()
    .uri()
    .custom((value, helpers) => {
      try {
        UrlValidator.validate(value);
        return value;
      } catch (error) {
        return helpers.error('any.invalid', { message: (error as Error).message });
      }
    })
    .required(),
  quality: Joi.string()
    .valid('144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p', '4320p', 'max', 'best')
    .default('720p'),
  audioOnly: Joi.boolean().default(false)
});

export const urlValidationSchema = Joi.object({
  url: Joi.string()
    .uri()
    .custom((value, helpers) => {
      try {
        UrlValidator.validate(value);
        return value;
      } catch (error) {
        return helpers.error('any.invalid', { message: (error as Error).message });
      }
    })
    .required()
});

export const streamSchema = Joi.object({
  url: Joi.string()
    .uri()
    .custom((value, helpers) => {
      try {
        UrlValidator.validate(value);
        return value;
      } catch (error) {
        return helpers.error('any.invalid', { message: (error as Error).message });
      }
    })
    .required(),
  quality: Joi.string()
    .valid('144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p', '4320p', 'max', 'best')
    .default('720p'),
  audioOnly: Joi.string()
    .valid('true', 'false')
    .default('false')
});

/**
 * Validation middleware factory
 */
export const validateRequest = (schema: Joi.ObjectSchema, source: 'body' | 'query' = 'body') => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req[source]);

    if (error) {
      logger.warn('Request validation failed', {
        path: req.path,
        error: error.details[0].message
      });
      return res.status(400).json({
        success: false,
        error: `Invalid input: ${error.details[0].message}`
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};
