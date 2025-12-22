import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against configured API keys
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        logger.warn('Authentication failed: No API key provided', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return res.status(401).json({
            success: false,
            error: 'API key required. Please include X-API-Key header.'
        });
    }

    // Get valid API keys from environment (comma-separated)
    const validKeys = process.env.API_KEYS?.split(',').map(k => k.trim()) || [];

    if (validKeys.length === 0) {
        logger.error('No API keys configured in environment');
        return res.status(500).json({
            success: false,
            error: 'Authentication not configured'
        });
    }

    if (!validKeys.includes(apiKey)) {
        logger.warn('Authentication failed: Invalid API key', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            keyPrefix: apiKey.substring(0, 8) + '...' // Log prefix only
        });
        return res.status(403).json({
            success: false,
            error: 'Invalid API key'
        });
    }

    // Authentication successful
    logger.info('API key authentication successful', {
        ip: req.ip,
        path: req.path
    });

    next();
};

/**
 * JWT Authentication Middleware
 * Validates Bearer token in Authorization header
 */
export const jwtAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authentication failed: No JWT token provided', {
            ip: req.ip,
            path: req.path
        });
        return res.status(401).json({
            success: false,
            error: 'JWT token required. Use Authorization: Bearer <token>'
        });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            logger.error('JWT_SECRET not configured');
            return res.status(500).json({
                success: false,
                error: 'Authentication not configured'
            });
        }

        const decoded = jwt.verify(token, jwtSecret);
        (req as any).user = decoded;

        logger.info('JWT authentication successful', {
            ip: req.ip,
            path: req.path,
            userId: decoded.id
        });

        next();
    } catch (error) {
        logger.warn('Authentication failed: Invalid JWT token', {
            ip: req.ip,
            path: req.path,
            error: (error as Error).message
        });
        return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

/**
 * Optional Authentication Middleware
 * Allows bypassing auth in development mode
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): Response | void => {
    const authRequired = process.env.REQUIRE_AUTH !== 'false';

    if (!authRequired) {
        logger.warn('Authentication bypassed (REQUIRE_AUTH=false)', {
            ip: req.ip,
            path: req.path
        });
        return next();
    }

    // Default to API key auth
    return apiKeyAuth(req, res, next);
};
