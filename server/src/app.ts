import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
// NOTE: dotenv is loaded by register.ts (via -r flag) *before* this module
// is evaluated, so process.env is fully populated here. Do NOT add
// dotenv.config() back here — that would create a race condition with service
// singletons that read env vars at module evaluation time.
import crypto from 'crypto';
import videoRoutes from './routes/video';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';


const app: Application = express();
const PORT = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== 'production';

// ── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      scriptSrc:   ["'self'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      mediaSrc:    ["'self'"],
      frameSrc:    ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard:    { action: 'deny' },
  noSniff:       true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ── Compression ──────────────────────────────────────────────────────────────
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    // Never compress SSE streams or binary file transfers
    if (req.path.includes('/progress/') || req.path.includes('/file/')) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
// Build the origin whitelist. In development always allow the Vite dev server
// ports. In production allow only the configured CORS_ORIGIN.
const buildAllowedOrigins = (): string[] => {
  const origins: (string | undefined)[] = [process.env.CORS_ORIGIN];

  if (isDev) {
    // Vite default port and any alternative dev ports
    origins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    );
  }

  return origins.filter((o): o is string => Boolean(o));
};

const allowedOrigins = buildAllowedOrigins();
logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (mobile apps, curl, Postman, SSE
    // connections from the same origin, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn('Blocked CORS request from unauthorized origin', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'Cache-Control',
  ],
  exposedHeaders: [
    'Content-Disposition',
    'X-Suggested-Filename',
    'Content-Length',
    'X-Request-ID',
  ],
  maxAge: 86400, // Preflight cache: 24 hours
}));

// ── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request ID ───────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const id = crypto.randomBytes(8).toString('hex');
  (req as any).id = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// ── Additional Security Headers ───────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'DENY');
  res.setHeader('Permissions-Policy',      'geolocation=(), microphone=(), camera=()');
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
  });
});

app.use('/api/video', videoRoutes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 CORS origins: ${allowedOrigins.join(', ') || '(none)'}`);
  logger.info(`🔑 Auth required: ${process.env.REQUIRE_AUTH !== 'false'}`);

  if (isDev) {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
    console.log(`🔑 Auth required: ${process.env.REQUIRE_AUTH !== 'false'}\n`);
  }
});

export default app;
