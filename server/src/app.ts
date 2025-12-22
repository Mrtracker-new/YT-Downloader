import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import crypto from 'crypto';
import videoRoutes from './routes/video';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enhanced Helmet configuration with explicit security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Enhanced compression for better performance
app.use(compression({
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress SSE or video streams
    if (req.path.includes('/progress/') || req.path.includes('/file/')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Strict CORS configuration with whitelist
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null, // Vite default
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('Blocked CORS request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracking
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', (req as any).id);
  next();
});

// Additional security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Note: Rate limiting is now applied per-route in video.ts with selective limiters

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/video', videoRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  const startupMsg = `🚀 Server running on port ${PORT}`;
  const envMsg = `📝 Environment: ${process.env.NODE_ENV || 'development'}`;
  const corsMsg = `🌐 CORS enabled for: ${process.env.CORS_ORIGIN || '*'}`;

  // Use both console.log and logger to ensure visibility
  console.log(startupMsg);
  console.log(envMsg);
  console.log(corsMsg);

  logger.info(startupMsg);
  logger.info(envMsg);
  logger.info(corsMsg);
});

export default app;
