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
  getQueueStatus
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
 * @route   GET /api/video/test
 * @desc    Test yt-dlp functionality
 * @access  Public
 */
router.get('/test', async (req, res) => {
  try {
    const { spawn } = await import('child_process');
    const ytdlpPath = 'C:\\Users\\rolan\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe';

    const process = spawn(ytdlpPath, ['--version']);
    let version = '';

    process.stdout.on('data', (data) => {
      version += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'yt-dlp is working',
          version: version.trim()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'yt-dlp failed to execute'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
