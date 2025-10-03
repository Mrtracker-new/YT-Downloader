import { Request, Response, NextFunction } from 'express';
import videoService from '../services/videoService';
import ytdlpService from '../services/ytdlpService';
import sanitize from 'sanitize-filename';
import logger from '../utils/logger';
import { createReadStream, unlink, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

// Store for tracking download progress
const downloadProgress = new Map<string, { progress: number; eta: string; speed: string; done: boolean }>();

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

    // Create sanitized filename
    const extension = audioOnly ? 'mp3' : 'mp4';
    const safeTitle = sanitize(videoInfo.title).replace(/[^a-zA-Z0-9_\-\.]/g, '_').substring(0, 100);
    const filename = `${safeTitle}.${extension}`;
    
    // Return download ID immediately so frontend can track progress
    const downloadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Start download in background
    // Use absolute path in current working directory for consistency with yt-dlp
    const tempDir = process.env.TEMP_PATH || resolve(process.cwd(), 'temp');
    
    logger.info(`[downloadVideo] Working directory: ${process.cwd()}`);
    logger.info(`[downloadVideo] Temp directory (absolute): ${tempDir}`);
    
    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      logger.info(`[downloadVideo] Creating temp directory: ${tempDir}`);
      mkdirSync(tempDir, { recursive: true });
    } else {
      logger.info(`[downloadVideo] Temp directory already exists`);
    }
    
    const tempFile = join(tempDir, `${downloadId}-${filename}`);
    
    logger.info(`Starting download: ${filename} (ID: ${downloadId})`);
    logger.info(`Temp file path (absolute): ${tempFile}`);
    
    // Initialize progress tracking
    downloadProgress.set(downloadId, { progress: 0, eta: 'Starting...', speed: '0', done: false });
    
    // Start download asynchronously
    ytdlpService.downloadVideo(url, quality, audioOnly, tempFile, (progress, eta, speed) => {
      downloadProgress.set(downloadId, { progress, eta, speed, done: false });
      logger.info(`[${downloadId}] Progress: ${progress}% - ETA: ${eta} - Speed: ${speed}`);
    }).then(() => {
      // Mark as complete with done flag
      downloadProgress.set(downloadId, { progress: 100, eta: '00:00', speed: 'Complete', done: true });
      logger.info(`Download complete: ${downloadId}`);
      logger.info(`[downloadVideo] Checking if file exists: ${tempFile}`);
      logger.info(`[downloadVideo] File exists: ${existsSync(tempFile)}`);
      if (existsSync(tempFile)) {
        const stats = require('fs').statSync(tempFile);
        logger.info(`[downloadVideo] File size: ${stats.size} bytes`);
      }
      // Keep file available for 2 minutes after completion for retrieval
      setTimeout(() => {
        downloadProgress.delete(downloadId);
        // Clean up temp file
        unlink(tempFile, (err) => {
          if (err) logger.error('Failed to delete temp file:', err);
        });
      }, 120000); // 2 minutes
    }).catch((error) => {
      logger.error(`Download failed: ${downloadId}`, error);
      downloadProgress.set(downloadId, { progress: 0, eta: 'Failed', speed: 'Error', done: false });
      setTimeout(() => downloadProgress.delete(downloadId), 5000);
      unlink(tempFile, () => {});
    });
    
    // Return download ID and file path immediately
    return res.json({
      success: true,
      data: {
        downloadId,
        filename
      },
      message: 'Download started'
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
    
    logger.info(`[getDownloadedFile] Found file: ${targetFile}`);
    const tempFile = join(tempDir, targetFile);
    
    // Extract filename by skipping the downloadId prefix (timestamp-randomstring-filename)
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
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send progress updates every 500ms
  const interval = setInterval(() => {
    const progress = downloadProgress.get(downloadId);
    
    if (progress) {
      logger.info(`[getDownloadProgress] Sending progress for ${downloadId}: ${progress.progress}%`);
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    } else {
      logger.info(`[getDownloadProgress] Download ${downloadId} not found in progress map, sending completion`);
      // Download completed or doesn't exist
      res.write(`data: ${JSON.stringify({ progress: 100, eta: '00:00', speed: 'Complete', done: true })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 500);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
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
