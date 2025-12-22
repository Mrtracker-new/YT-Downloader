import logger from '../utils/logger';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { tmpdir } from 'os';

export interface YtDlpVideoInfo {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  description: string;
  formats: YtDlpFormat[];
}

export interface YtDlpFormat {
  format_id: string;
  ext: string;
  quality: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  height?: number;
  width?: number;
}

class YtDlpService {
  // Use environment variable or fallback to system PATH
  private ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';

  private cookiesFile: string | null = null;
  private cache: Map<string, { data: YtDlpVideoInfo; timestamp: number }> = new Map();
  private cacheTTL = 15 * 60 * 1000; // 15 minutes cache for better performance
  private pendingRequests: Map<string, Promise<YtDlpVideoInfo>> = new Map(); // Request deduplication
  private quickInfoCache: Map<string, { data: Partial<YtDlpVideoInfo>; timestamp: number }> = new Map(); // Separate cache for quick info
  private quickInfoTTL = 5 * 60 * 1000; // 5 minutes for quick info

  constructor() {
    // Initialize cookies from environment variable if available
    this.initializeCookies();

    // Register cleanup handlers
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Initialize cookies from base64-encoded environment variable
   */
  private initializeCookies(): void {
    let cookiesBase64 = process.env.YOUTUBE_COOKIES_BASE64;

    if (cookiesBase64) {
      try {
        console.log('[ytdlpService] Found YOUTUBE_COOKIES_BASE64 environment variable');

        // Robustness: Strip "YOUTUBE_COOKIES_BASE64=" prefix if present (common copy-paste error)
        const prefixRegex = /^YOUTUBE_COOKIES_BASE64=?\s*/;
        if (prefixRegex.test(cookiesBase64.trim())) {
          console.log('[ytdlpService] Stripping "YOUTUBE_COOKIES_BASE64" prefix from environment variable');
          cookiesBase64 = cookiesBase64.trim().replace(prefixRegex, '');
        }

        // Strip surrounding quotes if present
        cookiesBase64 = cookiesBase64.trim();
        if ((cookiesBase64.startsWith('"') && cookiesBase64.endsWith('"')) ||
          (cookiesBase64.startsWith("'") && cookiesBase64.endsWith("'"))) {
          cookiesBase64 = cookiesBase64.slice(1, -1);
        }

        // Decode base64 cookies
        const cookiesContent = Buffer.from(cookiesBase64, 'base64').toString('utf-8');

        // Validation: basic check for Netscape format or Google domain
        if (!cookiesContent.includes('# Netscape HTTP Cookie File') && !cookiesContent.includes('.google.com')) {
          console.warn('[ytdlpService] WARNING: Decoded cookies do not contain Netscape header or recognized domain. May be invalid.');
          logger.warn('WARNING: Decoded cookies do not contain Netscape header or recognized domain.');
        }

        // Create temporary cookies file with secure permissions
        this.cookiesFile = join(tmpdir(), `yt-cookies-${Date.now()}.txt`);
        writeFileSync(this.cookiesFile, cookiesContent, { mode: 0o600, encoding: 'utf-8' });

        console.log(`[ytdlpService] Cookies file created at: ${this.cookiesFile}`);
        logger.info('YouTube cookies initialized successfully');
      } catch (error) {
        console.error('[ytdlpService] Failed to initialize cookies:', error);
        logger.error('Failed to initialize YouTube cookies:', error);
        this.cookiesFile = null;
      }
    } else {
      console.log('[ytdlpService] No cookies found - using cookie-free mode');
      logger.info('Running in cookie-free mode');
    }
  }

  /**
   * Cleanup cookies file on process exit
   */
  private cleanup(): void {
    if (this.cookiesFile && existsSync(this.cookiesFile)) {
      try {
        const { unlinkSync } = require('fs');
        unlinkSync(this.cookiesFile);
        console.log('[ytdlpService] Cleaned up cookies file');
        logger.info('Cookies file cleaned up successfully');
      } catch (error) {
        console.error('[ytdlpService] Failed to cleanup cookies:', error);
        logger.error('Failed to cleanup cookies file:', error);
      }
    }
  }

  /**
   * Get common yt-dlp arguments with optional cookies
   */
  private getCommonArgs(): string[] {
    const args: string[] = [];

    // Add cookies if available
    if (this.cookiesFile && existsSync(this.cookiesFile)) {
      args.push('--cookies', this.cookiesFile);
      console.log('[ytdlpService] Using cookies for authentication');
    } else {
      console.log('[ytdlpService] Using default client logic (cookie-free)');
    }

    // With authenticated cookies, let yt-dlp use its default client selection
    // This is more reliable than forcing mobile clients which can break extraction
    console.log('[ytdlpService] Using yt-dlp default client selection');

    return args;
  }

  /**
   * Get video information using yt-dlp
   */
  async getVideoInfo(url: string): Promise<YtDlpVideoInfo> {
    // Validate URL before processing to prevent command injection
    const { UrlValidator } = await import('../utils/validators');
    try {
      url = UrlValidator.validate(url);
    } catch (error) {
      logger.error('URL validation failed:', { error: (error as Error).message });
      throw error;
    }

    // Check cache first
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[ytdlpService] ⚡ Returning cached result (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
      logger.info('Returning cached video info');
      return Promise.resolve(cached.data);
    }

    // Check if there's already a pending request for this URL (request deduplication)
    const pending = this.pendingRequests.get(url);
    if (pending) {
      console.log(`[ytdlpService] ⏳ Returning pending request for: ${url}`);
      logger.info('Returning pending request for same URL');
      return pending;
    }

    // Create the promise and store it for deduplication
    const requestPromise = new Promise<YtDlpVideoInfo>((resolve, reject) => {
      console.log(`[ytdlpService] Getting video info for: ${url}`);
      console.log(`[ytdlpService] Using yt-dlp path: ${this.ytdlpPath}`);
      console.log(`[ytdlpService] Platform: ${process.platform}`);
      logger.info(`[ytdlpService] Getting video info for: ${url}`);
      logger.info(`[ytdlpService] Using yt-dlp path: ${this.ytdlpPath}`);
      logger.info(`[ytdlpService] Platform: ${process.platform}`);

      const args = [
        '--dump-json',
        '--no-warnings',
        '--no-check-certificates',  // Skip certificate validation for speed
        '--skip-download',  // We're only getting info, not downloading
        '--no-playlist',  // Don't process playlists for speed
        '--socket-timeout', '10',  // Reduced to 10 seconds for faster failures
        '--retries', '1',  // Only retry once for speed (was 2)
        '--extractor-retries', '1',  // Limit extractor retries
        '--fragment-retries', '1',  // Reduced fragment retries
        '--flat-playlist',  // Faster playlist handling if applicable
        '--skip-unavailable-fragments',  // Skip unavailable content
        '--lazy-playlist',  // Don't extract playlist info upfront
        '--geo-bypass',  // Bypass geo-restrictions faster
        '--no-check-formats',  // Skip format checking for speed
        ...this.getCommonArgs(),
        url
      ];

      let output = '';
      let errorOutput = '';
      const ytdlpProcess = spawn(this.ytdlpPath, args);

      ytdlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlpProcess.stderr.on('data', (data) => {
        const errMsg = data.toString();
        errorOutput += errMsg;
        console.error('[ytdlpService] yt-dlp stderr:', errMsg);
        logger.error('[ytdlpService] yt-dlp stderr:', errMsg);
      });

      ytdlpProcess.on('close', (code) => {
        console.log(`[ytdlpService] yt-dlp process closed with code: ${code}`);
        logger.info(`[ytdlpService] yt-dlp process closed with code: ${code}`);

        if (code === 0) {
          try {
            if (!output || output.trim() === '') {
              console.error('[ytdlpService] No output from yt-dlp');
              logger.error('[ytdlpService] No output from yt-dlp');
              reject(new Error('No output from yt-dlp'));
              return;
            }

            const info = JSON.parse(output);

            const videoInfo: YtDlpVideoInfo = {
              id: info.id,
              title: info.title,
              uploader: info.uploader || info.channel || 'Unknown',
              duration: info.duration || 0,
              thumbnail: info.thumbnail || '',
              description: info.description || '',
              formats: info.formats || []
            };

            console.log(`[ytdlpService] Successfully parsed video info: ${info.title}`);
            logger.info(`[ytdlpService] Successfully parsed video info: ${info.title}`);

            // Cache the result
            this.cache.set(url, { data: videoInfo, timestamp: Date.now() });
            console.log(`[ytdlpService] ✅ Cached result for future requests`);

            // Clean up cache if it gets too large (keep last 50 entries)
            if (this.cache.size > 50) {
              const oldestKey = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
              this.cache.delete(oldestKey);
            }

            resolve(videoInfo);
          } catch (error) {
            console.error('[ytdlpService] Failed to parse video info:', error);
            console.error('[ytdlpService] Raw output:', output.substring(0, 500));
            logger.error('[ytdlpService] Failed to parse video info:', error);
            logger.error('[ytdlpService] Raw output:', output.substring(0, 500));
            reject(new Error('Failed to parse video info'));
          }
        } else {
          console.error(`[ytdlpService] yt-dlp failed with code ${code}`);
          console.error(`[ytdlpService] Error output: ${errorOutput}`);
          logger.error(`[ytdlpService] yt-dlp failed with code ${code}`);
          logger.error(`[ytdlpService] Error output: ${errorOutput}`);
          reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput || 'No error message'}`));
        }
      });

      ytdlpProcess.on('error', (error) => {
        console.error('[ytdlpService] Failed to spawn yt-dlp:', error);
        logger.error('[ytdlpService] Failed to spawn yt-dlp:', error);
        this.pendingRequests.delete(url); // Clean up pending request
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    })
      .finally(() => {
        // Always clean up pending request when done
        this.pendingRequests.delete(url);
      });

    // Store the pending request
    this.pendingRequests.set(url, requestPromise);
    return requestPromise;
  }

  /**
   * Download video using yt-dlp with progress tracking
   */
  /**
   * Download video using yt-dlp with progress tracking
   */
  async downloadVideo(
    url: string,
    quality: string,
    audioOnly: boolean,
    outputPath: string,
    onProgress?: (progress: number, eta: string, speed: string, status?: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Check for ffmpeg presence (basic check)
      // In production, we assume it's in PATH or set via --ffmpeg-location if needed

      const args = [
        '--no-warnings',
        '--no-playlist',
        '--newline',  // Important: Output progress on new lines for parsing
        '--progress',  // Show progress
        '--console-title',  // Output progress to console
        '--buffer-size', '16K',  // Standard buffer size
        '--http-chunk-size', '10M',  // Download in larger chunks
        '--retries', '5',  // Increased retries
        '--fragment-retries', '5',
        '--concurrent-fragments', '3', // Moderate concurrency to avoid IP blocks
        '--no-part',  // Don't use .part files (avoids lock issues)
        '--no-mtime',  // Don't copy mtime
        ...this.getCommonArgs()
      ];

      // Format Selection Strategy
      if (audioOnly) {
        // Audio Mode: Extract and convert to MP3
        args.push('-x');
        args.push('--audio-format', 'mp3');
        args.push('--audio-quality', '0'); // Best quality (VBR)
        logger.info('Mode: Audio Extraction (MP3)');
      } else {
        // Video Mode: Smart Selection
        // Priority: Native MP4/M4A > Compatible Merge > Transcode
        let formatString: string;

        if (quality.toLowerCase() === 'max' || quality.toLowerCase() === 'best') {
          // Best quality, prefer mp4 container if available to avoid remixing
          formatString = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best';
        } else {
          const height = quality.replace(/[^0-9]/g, '');
          // 1. Exact height MP4/M4A components (No Transcode)
          // 2. Exact height Any Components (Remux needed)
          // 3. Fallback to best
          formatString = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
        }

        args.push('-f', formatString);
        args.push('--merge-output-format', 'mp4'); // Ensure final container is MP4
        logger.info(`Mode: Video Download (${quality}) - Format: ${formatString}`);
      }

      args.push('-o', outputPath);
      args.push(url);

      logger.info(`Starting process: ${this.ytdlpPath} ${args.join(' ')}`);

      const ytdlpProcess = spawn(this.ytdlpPath, args);
      let stderr = '';
      let currentStatus = 'Downloading';

      const parseOutput = (data: string) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          // 1. Detect Status Changes
          if (line.includes('[Merger]')) {
            currentStatus = 'Merging';
            if (onProgress) onProgress(99, '00:00', 'Processing', currentStatus);
            logger.info('Status: Merging files');
          } else if (line.includes('[ExtractAudio]')) {
            currentStatus = 'Converting';
            if (onProgress) onProgress(99, '00:00', 'Processing', currentStatus);
            logger.info('Status: Extracting Audio');
          } else if (line.includes('[FixupM3u8]')) {
            currentStatus = 'Finalizing';
            logger.info('Status: Fixing Container');
          }

          // 2. Parse Progress
          if (onProgress && line.includes('[download]')) {
            const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
            if (progressMatch) {
              const progress = parseFloat(progressMatch[1]);

              let eta = 'Unknown';
              const etaMatch = line.match(/ETA\s+(\d+:\d+)/);
              if (etaMatch) eta = etaMatch[1];

              let speed = '0';
              const speedMatch = line.match(/at\s+([\d\.]+[KMG]iB\/s)/);
              if (speedMatch) speed = speedMatch[1];

              // If we are strictly in "download" phase, pass through.
              // If we are getting download updates but status was "Merging", it might be a second pass, reset status
              if (currentStatus !== 'Downloading' && progress < 100) {
                currentStatus = 'Downloading';
              }

              onProgress(progress, eta, speed, currentStatus);
            }
          }
        }
      };

      ytdlpProcess.stdout.on('data', parseOutput);
      ytdlpProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        // Sometimes progress is in stderr
        parseOutput(data.toString());
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0) {
          // Verify file existence
          // With templates, we need to find the actual file created by yt-dlp
          // It will match the pattern: outputPath-template becomes real filename
          const dir = dirname(outputPath);
          const expectedPrefix = basename(outputPath).split('%(')[0]; // Get the downloadId- part

          try {
            const files = readdirSync(dir);
            const matchingFile = files.find((f: string) => f.startsWith(expectedPrefix));

            if (matchingFile) {
              const actualPath = join(dir, matchingFile);
              const stats = statSync(actualPath);
              if (stats.size > 0) {
                logger.info(`Download success: ${actualPath} (${stats.size} bytes)`);
                if (onProgress) onProgress(100, '00:00', 'Complete', 'Completed');
                resolve(actualPath);
                return;
              }
            }
          } catch (err) {
            logger.error('Error checking download file:', err);
          }

          reject(new Error('Download finished but file is missing or empty'));
        } else {
          logger.error('yt-dlp failed:', stderr);
          reject(new Error(`Download failed with code ${code}`));
        }
      });

      ytdlpProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }

  /**
   * Stream download directly to response
   */
  streamDownload(url: string, quality: string, audioOnly: boolean): any {
    const args = [
      '--no-warnings',
      '--no-playlist',
      ...this.getCommonArgs(),
      '-o', '-'
    ];

    if (audioOnly) {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      // Use the same improved format selection as regular download
      let formatString: string;

      if (quality.toLowerCase() === 'max' || quality.toLowerCase() === 'best') {
        // Best available quality without restrictions
        formatString = 'bestvideo+bestaudio/best';
      } else {
        // Extract height from quality string
        const height = quality.replace(/[^0-9]/g, '');
        formatString = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}][ext=mp4]/best[height<=${height}]/best`;
      }

      args.push('-f', formatString);
      args.push('--merge-output-format', 'mp4');
    }

    args.push(url);

    logger.info(`Streaming download: ${audioOnly ? 'audio' : quality}`);

    const process = spawn(this.ytdlpPath, args);

    process.stderr.on('data', (data) => {
      const output = data.toString().trim();
      // Only log errors and warnings, not progress/encoding info
      if (output.includes('ERROR') || output.includes('WARNING') || output.includes('error')) {
        logger.info('yt-dlp:', output);
      }
    });

    process.on('error', (error) => {
      logger.error('yt-dlp error:', error);
    });

    return process.stdout;
  }

  /**
   * Get quick basic video info (faster, minimal data)
   * Only fetches essential information without all format details
   */
  async getQuickVideoInfo(url: string): Promise<Partial<YtDlpVideoInfo>> {
    // Check quick info cache first
    const quickCached = this.quickInfoCache.get(url);
    if (quickCached && Date.now() - quickCached.timestamp < this.quickInfoTTL) {
      console.log(`[ytdlpService] ⚡ Returning cached quick info (${Math.round((Date.now() - quickCached.timestamp) / 1000)}s old)`);
      return Promise.resolve(quickCached.data);
    }

    // Check full cache as fallback
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-warnings',
        '--skip-download',
        '--no-playlist',
        '--socket-timeout', '8',  // Aggressive 8 second timeout
        '--retries', '1',  // Only one retry
        '--extractor-retries', '1',
        '--flat-playlist',  // Don't extract full playlist info
        '--lazy-playlist',  // Even faster playlist handling
        '--no-check-formats',  // Skip format validation
        '--geo-bypass',  // Quick geo-bypass
        '--print-json',  // Print JSON immediately
        ...this.getCommonArgs(),
        url
      ];

      let output = '';
      const ytdlpProcess = spawn(this.ytdlpPath, args);

      ytdlpProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const info = JSON.parse(output);
            const quickInfo = {
              id: info.id,
              title: info.title,
              uploader: info.uploader || info.channel || 'Unknown',
              duration: info.duration || 0,
              thumbnail: info.thumbnail || '',
              description: (info.description || '').substring(0, 500), // Truncate description
              formats: [], // Empty for quick fetch
            };

            // Cache the quick info result
            this.quickInfoCache.set(url, { data: quickInfo, timestamp: Date.now() });
            console.log(`[ytdlpService] ✅ Cached quick info for future requests`);

            // Clean up quick info cache if it gets too large (keep last 100 entries)
            if (this.quickInfoCache.size > 100) {
              const oldestKey = Array.from(this.quickInfoCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
              this.quickInfoCache.delete(oldestKey);
            }

            resolve(quickInfo);
          } catch (error) {
            reject(new Error('Failed to parse quick video info'));
          }
        } else {
          reject(new Error('Failed to fetch quick video info'));
        }
      });

      ytdlpProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Validate YouTube URL
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      console.log(`[ytdlpService] Validating URL: ${url}`);
      logger.info(`[ytdlpService] Validating URL: ${url}`);
      await this.getVideoInfo(url);
      console.log(`[ytdlpService] URL validation successful`);
      logger.info(`[ytdlpService] URL validation successful`);
      return true;
    } catch (error) {
      console.error(`[ytdlpService] URL validation failed:`, error);
      logger.error(`[ytdlpService] URL validation failed:`, error);
      return false;
    }
  }
}

export default new YtDlpService();
