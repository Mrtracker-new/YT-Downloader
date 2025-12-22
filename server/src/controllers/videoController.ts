import { Request, Response, NextFunction } from 'express';
import videoService from '../services/videoService';
import ytdlpService from '../services/ytdlpService';
import downloadQueue from '../services/DownloadQueue';
import logger from '../utils/logger';
import { createReadStream, unlink, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { PathValidator, IdGenerator, FilenameValidator } from '../utils/validators';

// Store for tracking download progress
// Store for tracking download progress
const downloadProgress = new Map<string, { progress: number; eta: string; speed: string; done: boolean; maxProgress: number; status: string }>();

// Run cleanup on startup
const cleanupTempFiles = () => {
  const tempDir = process.env.TEMP_PATH || resolve(process.cwd(), 'temp');
  if (existsSync(tempDir)) {
    const files = readdirSync(tempDir);
    const now = Date.now();
    let count = 0;
    files.forEach(file => {
      const filePath = join(tempDir, file);
      try {
        const stats = require('fs').statSync(filePath);
        // Delete files older than 1 hour
        if (now - stats.mtimeMs > 3600000) {
          require('fs').unlinkSync(filePath);
          count++;
        }
      } catch (e) { /* ignore */ }
    });
    if (count > 0) logger.info(`[Cleanup] Removed ${count} old temp files`);
  }
};
// Run once
// Run once
cleanupTempFiles();

/**
 * Get quick video information (faster, basic info only)
 */
export const getQuickVideoInfo = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { url } = req.body;

    console.log(`[getQuickVideoInfo] Received request for URL: ${url}`);
    logger.info(`Received getQuickVideoInfo request for URL: ${url}`);

    if (!url) {
      console.error('[getQuickVideoInfo] No URL provided');
      logger.error('No URL provided in request');
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Get quick video info
    console.log('[getQuickVideoInfo] Fetching quick video info...');
    logger.info('Fetching quick video info...');
    const quickInfo = await ytdlpService.getQuickVideoInfo(url);
    console.log(`[getQuickVideoInfo] Successfully fetched: ${quickInfo.title}`);
    logger.info(`Successfully fetched quick video info: ${quickInfo.title}`);

    res.json({
      success: true,
      data: quickInfo
    });
  } catch (error) {
    console.error('[getQuickVideoInfo] Error:', error);
    logger.error('Error in getQuickVideoInfo:', error);
    next(error);
  }
};

/**
 * Get video information
 */
export const getVideoInfo = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { url } = req.body;

    console.log(`[getVideoInfo] Received request for URL: ${url}`);
    logger.info(`Received getVideoInfo request for URL: ${url}`);

    if (!url) {
      console.error('[getVideoInfo] No URL provided');
      logger.error('No URL provided in request');
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate video
    console.log('[getVideoInfo] Validating video URL...');
    logger.info('Validating video URL...');
    const isValid = await videoService.validateVideo(url);
    console.log(`[getVideoInfo] Validation result: ${isValid}`);
    if (!isValid) {
      console.error(`[getVideoInfo] Validation failed for URL: ${url}`);
      logger.error(`Video validation failed for URL: ${url}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid or unavailable YouTube video'
      });
    }

    // Get video info
    console.log('[getVideoInfo] Fetching video info with yt-dlp...');
    logger.info('Fetching video info with yt-dlp...');
    const videoInfo = await videoService.getVideoInfo(url);
    console.log(`[getVideoInfo] Successfully fetched: ${videoInfo.title}`);
    logger.info(`Successfully fetched video info: ${videoInfo.title}`);

    res.json({
      success: true,
      data: videoInfo
    });
  } catch (error) {
    console.error('[getVideoInfo] Error:', error);
    logger.error('Error in getVideoInfo:', error);
    logger.error('Error stack:', (error as Error).stack);
    next(error);
  }
};

/**
 * Download video with progress tracking
 */
export const downloadVideo = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { url, quality = '720p', audioOnly = false } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Get video info for filename using yt-dlp
    const videoInfo = await ytdlpService.getVideoInfo(url);

    // Create sanitized filename using secure method
    const extension = audioOnly ? 'mp3' : 'mp4';
    const filename = FilenameValidator.createSafeFilename(videoInfo.title, extension);

    // Generate cryptographically secure download ID
    const downloadId = IdGenerator.generateDownloadId();

    // Use absolute path in current working directory for consistency with yt-dlp
    const tempDir = process.env.TEMP_PATH || resolve(process.cwd(), 'temp');

    logger.info(`[downloadVideo] Working directory: ${process.cwd()}`);
    logger.info(`[downloadVideo] Temp directory (absolute): ${tempDir}`);

    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      logger.info(`[downloadVideo] Creating temp directory: ${tempDir}`);
      mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = join(tempDir, `${downloadId}-${filename}`);

    logger.info(`Adding to queue: ${filename} (ID: ${downloadId})`);

    // Initialize progress tracking
    downloadProgress.set(downloadId, {
      progress: 0,
      eta: 'Queued...',
      speed: '0',
      done: false,
      maxProgress: 0,
      status: 'Queued'
    });

    // Add to download queue
    const queueResult = await downloadQueue.addDownload(
      downloadId,
      url,
      quality,
      audioOnly,
      tempFile,
      // Progress callback
      (progress, eta, speed, status) => {
        // Get current max progress to prevent backwards jumps (happens with multi-stream downloads)
        const current = downloadProgress.get(downloadId);
        const currentMax = current?.maxProgress || 0;

        // Only update if progress is moving forward, or if it's a new download phase
        const finalProgress = Math.max(progress, currentMax);

        downloadProgress.set(downloadId, {
          progress: finalProgress,
          eta,
          speed,
          done: false,
          maxProgress: finalProgress,
          status: status || 'Downloading'
        });
        // Reduce log spam
        if (Math.round(finalProgress) % 10 === 0) {
          logger.info(`[${downloadId}] ${status || 'Downloading'} ${finalProgress}%`);
        }
      },
      // Completion callback
      (error) => {
        if (error) {
          logger.error(`Download failed: ${downloadId}`, error);
          downloadProgress.set(downloadId, {
            progress: 0,
            eta: 'Failed',
            speed: 'Error',
            done: false,
            maxProgress: 0,
            status: 'Error'
          });
          setTimeout(() => downloadProgress.delete(downloadId), 10000);
          unlink(tempFile, () => { });
        } else {
          // Mark as complete with done flag
          downloadProgress.set(downloadId, {
            progress: 100,
            eta: '00:00',
            speed: 'Complete',
            done: true,
            maxProgress: 100,
            status: 'Completed'
          });
          logger.info(`Download complete: ${downloadId}`);

          // Keep file available for 5 minutes after completion for retrieval
          setTimeout(() => {
            downloadProgress.delete(downloadId);
            // Clean up temp file
            unlink(tempFile, (err) => {
              if (err) logger.error('Failed to delete temp file:', err);
            });
          }, 300000); // 5 minutes
        }
      }
    );

    // Check if successfully queued
    if (!queueResult.queued) {
      downloadProgress.delete(downloadId);
      return res.status(503).json({
        success: false,
        error: queueResult.error || 'Unable to queue download'
      });
    }

    // Return download ID and queue status
    return res.json({
      success: true,
      data: {
        downloadId,
        filename,
        queuePosition: queueResult.position
      },
      message: queueResult.position === 1 ? 'Download starting' : `Queued at position ${queueResult.position}`
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Unknown error';
    logger.error('Error in downloadVideo:', {
      error: errorMessage,
      stack: (error as Error).stack
    });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Download failed: ${errorMessage}`
      });
    }
  }
};

/**
 * Retrieve downloaded file
 */
export const getDownloadedFile = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { downloadId } = req.params;

    if (!downloadId) {
      return res.status(400).json({
        success: false,
        error: 'Download ID is required'
      });
    }

    // Validate download ID format to prevent path traversal
    try {
      PathValidator.validateDownloadId(downloadId);
    } catch (error) {
      logger.error('Invalid download ID:', { downloadId, error: (error as Error).message });
      return res.status(400).json({
        success: false,
        error: 'Invalid download ID format'
      });
    }

    // Find the temp file
    // Use same path as download function
    const tempDir = process.env.TEMP_PATH || resolve(process.cwd(), 'temp');

    logger.info(`[getDownloadedFile] Looking for download ID: ${downloadId}`);
    logger.info(`[getDownloadedFile] Temp directory: ${tempDir}`);

    // Check if directory exists
    if (!existsSync(tempDir)) {
      logger.error(`[getDownloadedFile] Directory does not exist: ${tempDir}`);
      return res.status(404).json({
        success: false,
        error: 'Download directory not found'
      });
    }

    const files = readdirSync(tempDir);
    logger.info(`[getDownloadedFile] Files in directory: ${JSON.stringify(files)}`);
    const targetFile = files.find((f: string) => f.startsWith(downloadId));

    if (!targetFile) {
      logger.error(`[getDownloadedFile] File not found for download ID: ${downloadId}`);
      logger.error(`[getDownloadedFile] Available files: ${files.join(', ')}`);
      return res.status(404).json({
        success: false,
        error: 'Download not found or expired'
      });
    }

    const tempFile = join(tempDir, targetFile);

    // CRITICAL: Validate the resolved path to prevent path traversal
    try {
      PathValidator.validatePath(tempFile, tempDir);
    } catch (error) {
      logger.error('Path traversal attempt detected:', {
        downloadId,
        requestedFile: targetFile,
        tempDir
      });
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    logger.info(`[getDownloadedFile] Found file: ${targetFile}`);

    // Extract filename by skipping the downloadId prefix
    // Split by '-' and skip first 2 parts (timestamp and random string)
    const parts = targetFile.split('-');
    const filename = parts.slice(2).join('-'); // Rejoin in case filename has dashes

    // Set response headers
    const contentDisposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

    res.writeHead(200, {
      'Content-Type': filename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4',
      'Content-Disposition': contentDisposition,
      'X-Suggested-Filename': filename,
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Suggested-Filename',
      'Cache-Control': 'no-cache'
    });

    // Stream the file
    const fileStream = createReadStream(tempFile);

    fileStream.on('error', (error) => {
      logger.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to read downloaded file'
        });
      }
    });

    fileStream.on('end', () => {
      logger.info(`File sent: ${filename}`);
    });

    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error in getDownloadedFile:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve file'
      });
    }
  }
};

/**
 * Get download progress (Server-Sent Events)
 */
export const getDownloadProgress = (req: Request, res: Response): void => {
  const { downloadId } = req.params;

  logger.info(`[getDownloadProgress] Client connected for download ID: ${downloadId}`);

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // Disable buffering in nginx/proxies
  });

  // Send initial connection message
  res.write(`:ok\n\n`);

  // Send progress updates every 300ms for more responsive updates
  const interval = setInterval(() => {
    const progress = downloadProgress.get(downloadId);

    if (progress) {
      logger.info(`[getDownloadProgress] Sending progress for ${downloadId}: ${progress.progress}% (done: ${progress.done})`);

      try {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      } catch (err) {
        logger.error(`[getDownloadProgress] Error writing to response:`, err);
        clearInterval(interval);
        return;
      }

      // Close connection if download is complete
      if (progress.done) {
        logger.info(`[getDownloadProgress] Download complete, closing SSE connection for ${downloadId}`);
        clearInterval(interval);
        // Small delay before closing to ensure last message is received
        setTimeout(() => {
          try {
            res.end();
          } catch (err) {
            logger.error(`[getDownloadProgress] Error ending response:`, err);
          }
        }, 100);
      }
    } else {
      logger.info(`[getDownloadProgress] Download ${downloadId} not found in progress map, checking if recently completed`);
      // Check if download was recently started (give it 2 seconds grace period)
      // If not found and not in progress, send completion
      res.write(`data: ${JSON.stringify({ progress: 100, eta: '00:00', speed: 'Complete', done: true })}\n\n`);
      clearInterval(interval);
      setTimeout(() => {
        try {
          res.end();
        } catch (err) {
          logger.error(`[getDownloadProgress] Error ending response:`, err);
        }
      }, 100);
    }
  }, 300);

  // Clean up on client disconnect
  req.on('close', () => {
    logger.info(`[getDownloadProgress] Client disconnected for ${downloadId}`);
    clearInterval(interval);
  });
};


/**
 * Get available quality options
 */
export const getQualityOptions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const videoInfo = await videoService.getVideoInfo(url);

    // Extract unique quality options
    const videoQualities = [
      ...new Set(
        videoInfo.formats
          .filter(f => f.hasVideo && f.qualityLabel)
          .map(f => f.qualityLabel)
      )
    ];

    const audioQualities = [
      ...new Set(
        videoInfo.formats
          .filter(f => f.hasAudio && !f.hasVideo && f.audioQuality)
          .map(f => f.audioQuality)
      )
    ];

    res.json({
      success: true,
      data: {
        videoQualities,
        audioQualities
      }
    });
  } catch (error) {
    logger.error('Error in getQualityOptions:', error);
    next(error);
  }
};

/**
 * Validate YouTube URL
 */
export const validateUrl = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    const isValid = await videoService.validateVideo(url);

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    logger.error('Error in validateUrl:', error);
    next(error);
  }
};

/**
 * Stream video directly (for QR code sharing)
 */
export const streamVideo = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { url, quality = '720p', audioOnly = 'false' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL to prevent command injection
    const { UrlValidator, FilenameValidator } = await import('../utils/validators');
    let validatedUrl: string;
    try {
      validatedUrl = UrlValidator.validate(url);
    } catch (error) {
      logger.error('URL validation failed in streamVideo:', { error: (error as Error).message });
      return res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }

    const isAudioOnly = audioOnly === 'true';

    logger.info(`[streamVideo] Starting stream for ${UrlValidator.sanitizeForLogging(validatedUrl)} (quality: ${quality}, audioOnly: ${isAudioOnly})`);

    // Get video info for filename
    const videoInfo = await ytdlpService.getVideoInfo(validatedUrl);
    const extension = isAudioOnly ? 'mp3' : 'mp4';
    const filename = FilenameValidator.createSafeFilename(videoInfo.title, extension);

    // Set response headers
    res.writeHead(200, {
      'Content-Type': isAudioOnly ? 'audio/mpeg' : 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'X-Suggested-Filename': filename,
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Suggested-Filename',
      'Cache-Control': 'no-cache'
    });

    // Stream the download directly
    const stream = ytdlpService.streamDownload(validatedUrl, quality as string, isAudioOnly);

    stream.on('error', (error: Error) => {
      logger.error('[streamVideo] Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Stream failed'
        });
      }
    });

    stream.pipe(res);
  } catch (error) {
    logger.error('[streamVideo] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Stream failed'
      });
    }
  }
};

/**
 * Get queue status for a download or overall queue stats
 */
export const getQueueStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { downloadId } = req.params;

    if (downloadId) {
      // Get status for specific download
      const status = downloadQueue.getQueueStatus(downloadId);

      return res.json({
        success: true,
        data: status
      });
    } else {
      // Get overall queue statistics
      const stats = downloadQueue.getStats();

      return res.json({
        success: true,
        data: stats
      });
    }
  } catch (error) {
    logger.error('Error in getQueueStatus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get queue status'
    });
  }
};

