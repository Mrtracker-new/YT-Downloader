import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import videoRoutes from './routes/video';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers

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

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

app.use(express.json({ limit: '10mb' })); // Increase limit for large requests
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
