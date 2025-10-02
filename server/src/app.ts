import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import videoRoutes from './routes/video';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression for faster responses
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

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
