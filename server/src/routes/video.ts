import { Router } from 'express';
import {
  getVideoInfo,
  getQuickVideoInfo,
  downloadVideo,
  getQualityOptions,
  validateUrl,
  getDownloadProgress,
  getDownloadedFile,
  streamVideo,
  getQueueStatus,
  cancelDownload,
  getSubtitleLanguages,
  getSubtitleFile
} from '../controllers/videoController';
import { strictRateLimiter, lenientRateLimiter, noRateLimit } from '../middleware/rateLimit';
import { optionalAuth } from '../middleware/auth';
import { validateRequest, downloadSchema, urlValidationSchema, streamSchema } from '../utils/validators';

const router = Router();

/**
 * @route   POST /api/video/quick-info
 * @desc    Get quick video information (faster, basic info)
 * @access  Protected (requires auth)
 */
router.post('/quick-info', optionalAuth, strictRateLimiter, validateRequest(urlValidationSchema), getQuickVideoInfo);

/**
 * @route   POST /api/video/info
 * @desc    Get video information
 * @access  Protected (requires auth)
 */
router.post('/info', optionalAuth, strictRateLimiter, validateRequest(urlValidationSchema), getVideoInfo);

/**
 * @route   POST /api/video/download
 * @desc    Download video
 * @access  Protected (requires auth)
 */
router.post('/download', optionalAuth, strictRateLimiter, validateRequest(downloadSchema), downloadVideo);

/**
 * @route   POST /api/video/qualities
 * @desc    Get available quality options
 * @access  Protected (requires auth)
 */
router.post('/qualities', optionalAuth, strictRateLimiter, validateRequest(urlValidationSchema), getQualityOptions);

/**
 * @route   POST /api/video/validate
 * @desc    Validate YouTube URL
 * @access  Public
 */
router.post('/validate', lenientRateLimiter, validateUrl);

/**
 * @route   GET /api/video/progress/:downloadId
 * @desc    Get download progress via Server-Sent Events
 * @access  Public
 */
router.get('/progress/:downloadId', noRateLimit, getDownloadProgress);

/**
 * @route   GET /api/video/file/:downloadId
 * @desc    Retrieve downloaded file
 * @access  Public
 */
router.get('/file/:downloadId', noRateLimit, getDownloadedFile);

/**
 * @route   GET /api/video/stream
 * @desc    Stream video directly (for QR code sharing)
 * @access  Protected (requires auth)
 */
router.get('/stream', optionalAuth, strictRateLimiter, validateRequest(streamSchema, 'query'), streamVideo);

/**
 * @route   GET /api/video/queue/:downloadId?
 * @desc    Get queue status for a specific download or overall queue stats
 * @access  Public
 */
router.get('/queue/:downloadId?', lenientRateLimiter, getQueueStatus);

/**
 * @route   DELETE /api/video/download/:downloadId
 * @desc    Cancel an in-progress or queued download
 * @access  Public
 */
router.delete('/download/:downloadId', lenientRateLimiter, cancelDownload);

/**
 * @route   GET /api/video/subtitles?url=...
 * @desc    Get available subtitle languages for a video (re-uses cached video info)
 * @access  Protected (requires auth)
 */
router.get('/subtitles', optionalAuth, lenientRateLimiter, getSubtitleLanguages);

/**
 * @route   GET /api/video/subtitle/:downloadId
 * @desc    Retrieve sidecar subtitle file (.srt) for a completed download
 * @access  Public
 */
router.get('/subtitle/:downloadId', noRateLimit, getSubtitleFile);

/**
 * @route   GET /api/video/test
 * @desc    Test yt-dlp functionality
 * @access  Public
 */
router.get('/test', async (_req, res) => {
  try {
    const { spawn } = await import('child_process');
    // Resolve yt-dlp via environment variable or system PATH
    const ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';

    const ytdlpProc = spawn(ytdlpPath, ['--version']);
    let version = '';

    ytdlpProc.stdout.on('data', (data: Buffer) => {
      version += data.toString();
    });

    ytdlpProc.on('close', (code: number | null) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'yt-dlp is working',
          path:    ytdlpPath,
          version: version.trim(),
        });
      } else {
        res.status(500).json({
          success: false,
          error: `yt-dlp exited with code ${code}`,
        });
      }
    });

    ytdlpProc.on('error', (err: Error) => {
      res.status(500).json({
        success: false,
        error: `Failed to spawn yt-dlp: ${err.message}`,
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
