import { Router } from 'express';
import {
  getVideoInfo,
  getQuickVideoInfo,
  downloadVideo,
  getQualityOptions,
  validateUrl,
  getDownloadProgress,
  getDownloadedFile,
  streamVideo
} from '../controllers/videoController';

const router = Router();

/**
 * @route   POST /api/video/quick-info
 * @desc    Get quick video information (faster, basic info)
 * @access  Public
 */
router.post('/quick-info', getQuickVideoInfo);

/**
 * @route   POST /api/video/info
 * @desc    Get video information
 * @access  Public
 */
router.post('/info', getVideoInfo);

/**
 * @route   POST /api/video/download
 * @desc    Download video
 * @access  Public
 */
router.post('/download', downloadVideo);

/**
 * @route   POST /api/video/qualities
 * @desc    Get available quality options
 * @access  Public
 */
router.post('/qualities', getQualityOptions);

/**
 * @route   POST /api/video/validate
 * @desc    Validate YouTube URL
 * @access  Public
 */
router.post('/validate', validateUrl);

/**
 * @route   GET /api/video/progress/:downloadId
 * @desc    Get download progress via Server-Sent Events
 * @access  Public
 */
router.get('/progress/:downloadId', getDownloadProgress);

/**
 * @route   GET /api/video/file/:downloadId
 * @desc    Retrieve downloaded file
 * @access  Public
 */
router.get('/file/:downloadId', getDownloadedFile);

/**
 * @route   GET /api/video/stream
 * @desc    Stream video directly (for QR code sharing)
 * @access  Public
 */
router.get('/stream', streamVideo);


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
