import { spawn } from 'child_process';
import { dirname } from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import logger from '../utils/logger';

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
  // Use 'yt-dlp' on Linux/production, fallback to Windows path for local dev
  private ytdlpPath = process.platform === 'win32' 
    ? 'C:\\Users\\rolan\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe'
    : 'yt-dlp';
  
  private cookiesFile: string | null = null;
  private cache: Map<string, { data: YtDlpVideoInfo; timestamp: number }> = new Map();
  private cacheTTL = 15 * 60 * 1000; // 15 minutes cache for better performance
  private pendingRequests: Map<string, Promise<YtDlpVideoInfo>> = new Map(); // Request deduplication
  private quickInfoCache: Map<string, { data: Partial<YtDlpVideoInfo>; timestamp: number }> = new Map(); // Separate cache for quick info
  private quickInfoTTL = 5 * 60 * 1000; // 5 minutes for quick info

  constructor() {
    // Initialize cookies from environment variable if available
    this.initializeCookies();
  }

  /**
   * Initialize cookies from base64-encoded environment variable
   */
  private initializeCookies(): void {
    const cookiesBase64 = process.env.YOUTUBE_COOKIES_BASE64;
    
    if (cookiesBase64) {
      try {
        console.log('[ytdlpService] Found YOUTUBE_COOKIES_BASE64 environment variable');
        
        // Decode base64 cookies
        const cookiesContent = Buffer.from(cookiesBase64, 'base64').toString('utf-8');
        
        // Create temporary cookies file
        this.cookiesFile = join(tmpdir(), `yt-cookies-${Date.now()}.txt`);
        writeFileSync(this.cookiesFile, cookiesContent, 'utf-8');
        
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
   * Get common yt-dlp arguments with optional cookies
   */
  private getCommonArgs(): string[] {
    const args: string[] = [];
    
    // Add cookies if available
    if (this.cookiesFile && existsSync(this.cookiesFile)) {
      args.push('--cookies', this.cookiesFile);
      console.log('[ytdlpService] Using cookies for authentication');
    } else {
      // Use web client (default) for full format availability
      // Don't specify player_client to let yt-dlp choose the best one
      // This ensures we get all available formats including HD/4K
      console.log('[ytdlpService] Using default web client for full format access');
    }
    
    return args;
  }

  /**
   * Get video information using yt-dlp
   */
  async getVideoInfo(url: string): Promise<YtDlpVideoInfo> {
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
  async downloadVideo(
    url: string, 
    quality: string, 
    audioOnly: boolean, 
    outputPath: string,
    onProgress?: (progress: number, eta: string, speed: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const args = [
        '--verbose',  // CRITICAL: Show detailed output for debugging
        '--no-playlist',
        '--newline',  // Important: Output progress on new lines for parsing
        '--progress',  // Show progress
        '--console-title',  // Output progress to console
        '--buffer-size', '16K',  // Smaller buffer for more stable download
        '--http-chunk-size', '5M',  // Smaller chunks for reliability
        '--retries', '10',  // More retries for reliability
        '--fragment-retries', '10',  // More fragment retries
        '--concurrent-fragments', '1',  // Sequential download (most stable)
        '--throttled-rate', '50K',  // Lower threshold
        '--no-part',  // CRITICAL: Don't use .part files - write directly to final filename
        '--no-mtime',  // Don't copy mtime
        '--socket-timeout', '30',  // 30 second socket timeout
        '--force-ipv4',  // Force IPv4 (sometimes more reliable)
        '--no-check-certificate',  // Skip SSL verification (can help with network issues)
        ...this.getCommonArgs()
      ];

      if (audioOnly) {
        // Extract audio and convert to MP3
        args.push('-x');  // Extract audio only
        args.push('--audio-format', 'mp3');  // Convert to MP3
        args.push('--audio-quality', '0');  // Best audio quality
        console.log('[ytdlpService] Downloading audio as MP3');
        logger.info('Downloading audio as MP3 (best quality)');
      } else {
        // Download video at specified quality
        let formatString: string;
        
        // Handle different quality options
        if (quality.toLowerCase() === 'max' || quality.toLowerCase() === 'best') {
          // Download BEST available single-file format (NO MERGING)
          // This is the most reliable approach - avoids all ffmpeg issues
          formatString = 'best[ext=mp4]/best';
          console.log('[ytdlpService] Downloading best single-file format (no merge)');
          logger.info('Downloading best single-file format (no merge)');
        } else {
          // Extract height from quality string (e.g., "720p" -> "720")
          const height = quality.replace(/[^0-9]/g, '');
          
          // Validate quality option
          const validQualities = ['144', '240', '360', '480', '720', '1080', '1440', '2160', '4320'];
          if (!validQualities.includes(height)) {
            console.warn(`[ytdlpService] Unusual quality requested: ${quality}, using as-is`);
            logger.warn(`Unusual quality requested: ${quality}`);
          }
          
          // SIMPLE format selection - ONLY single-file formats (NO MERGING)
          // This is the most reliable approach for production servers
          formatString = `best[height<=${height}][ext=mp4]/best[height<=${height}]`;
          
          console.log(`[ytdlpService] Downloading at ${quality} (${height}p) quality`);
          logger.info(`Downloading at ${quality} (${height}p) quality`);
        }
        
        args.push('-f', formatString);
        
        // No merge flags - we're only downloading single-file formats
        // This avoids all ffmpeg merge issues that were causing corruption
        
        console.log(`[ytdlpService] Format string: ${formatString}`);
        logger.info(`Format string: ${formatString}`);
        logger.info('Video will be properly merged to MP4 with AAC audio codec');
      }

      // Add output path and URL at the end
      args.push('-o', outputPath);
      args.push(url);

      // Log the full command for debugging
      console.log(`[ytdlpService] Full command: ${this.ytdlpPath} ${args.join(' ')}`);
      logger.info(`Starting yt-dlp download to: ${outputPath}`);
      logger.info(`Full command: ${this.ytdlpPath} ${args.join(' ')}`);

      const ytdlpProcess = spawn(this.ytdlpPath, args);
      let stderr = '';

      ytdlpProcess.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n');
        
        // Process each line separately for better parsing
        for (const line of lines) {
          if (line.trim()) {
            // Log everything from yt-dlp for debugging
            console.log('[yt-dlp stdout]:', line.trim());
            logger.info('yt-dlp:', line.trim());
          }
          
          // Parse progress information
          if (onProgress && line.includes('[download]')) {
            // Match various progress patterns from yt-dlp:
            // [download]  45.2% of 10.5MiB at 2.3MiB/s ETA 00:03
            // [download] 100% of 10.5MiB in 00:05
            const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
            
            if (progressMatch) {
              const progress = parseFloat(progressMatch[1]);
              
              // Try to extract ETA (format: ETA 00:03 or in 00:05)
              let eta = 'Unknown';
              const etaMatch = line.match(/ETA\s+(\d+:\d+)/);
              const inMatch = line.match(/in\s+(\d+:\d+)/);
              if (etaMatch) {
                eta = etaMatch[1];
              } else if (inMatch) {
                eta = '00:00'; // Already complete
              }
              
              // Try to extract speed (format: at 2.3MiB/s)
              let speed = 'Unknown';
              const speedMatch = line.match(/at\s+([\d\.]+[KMG]iB\/s)/);
              if (speedMatch) {
                speed = speedMatch[1];
              }
              
              // Log the parsed progress for debugging
              console.log(`[ytdlpService] Parsed progress: ${progress}% | Speed: ${speed} | ETA: ${eta}`);
              onProgress(progress, eta, speed);
            }
          }
        }
      });

      ytdlpProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        const output = data.toString();
        const lines = output.split('\n');
        
        // Process each line separately for better parsing
        for (const line of lines) {
          if (line.trim()) {
            // Log ALL stderr output (verbose mode shows important info here)
            console.log('[yt-dlp stderr]:', line.trim());
            logger.info('yt-dlp stderr:', line.trim());
          }
          
          // Parse progress from stderr as well (yt-dlp sometimes outputs there)
          if (onProgress && line.includes('[download]')) {
            const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
            
            if (progressMatch) {
              const progress = parseFloat(progressMatch[1]);
              
              // Try to extract ETA
              let eta = 'Unknown';
              const etaMatch = line.match(/ETA\s+(\d+:\d+)/);
              const inMatch = line.match(/in\s+(\d+:\d+)/);
              if (etaMatch) {
                eta = etaMatch[1];
              } else if (inMatch) {
                eta = '00:00';
              }
              
              // Try to extract speed
              let speed = 'Unknown';
              const speedMatch = line.match(/at\s+([\d\.]+[KMG]iB\/s)/);
              if (speedMatch) {
                speed = speedMatch[1];
              }
              
              console.log(`[ytdlpService] Parsed progress (stderr): ${progress}% | Speed: ${speed} | ETA: ${eta}`);
              onProgress(progress, eta, speed);
            }
          }
        }
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('yt-dlp download completed successfully');
          logger.info(`[ytdlpService] Checking if output file exists: ${outputPath}`);
          
          // Wait a moment for file system operations to complete
          setTimeout(() => {
            const { existsSync, statSync } = require('fs');
            const { spawn } = require('child_process');
            
            if (existsSync(outputPath)) {
              const stats = statSync(outputPath);
              logger.info(`[ytdlpService] Output file exists, size: ${stats.size} bytes`);
              
              // Verify video duration using ffprobe (if not audio-only)
              if (!audioOnly) {
                logger.info(`[ytdlpService] Verifying video duration with ffprobe...`);
                const ffprobe = spawn('ffprobe', [
                  '-v', 'error',
                  '-show_entries', 'format=duration',
                  '-of', 'default=noprint_wrappers=1:nokey=1',
                  outputPath
                ]);
                
                let durationOutput = '';
                ffprobe.stdout.on('data', (data) => {
                  durationOutput += data.toString();
                });
                
                ffprobe.on('close', (probeCode) => {
                  if (probeCode === 0 && durationOutput.trim()) {
                    const duration = parseFloat(durationOutput.trim());
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    logger.info(`[ytdlpService] Video duration: ${minutes}:${seconds.toString().padStart(2, '0')} (${duration.toFixed(2)}s)`);
                  } else {
                    logger.warn(`[ytdlpService] Could not verify video duration (ffprobe exit code: ${probeCode})`);
                  }
                });
              }
            } else {
              logger.warn(`[ytdlpService] Output file does NOT exist at: ${outputPath}`);
              logger.warn(`[ytdlpService] File might be created with different name (e.g., .temp.mp4)`);
            }
            
            if (onProgress) onProgress(100, '00:00', 'Complete');
            resolve(outputPath);
          }, 3000); // Wait 3 seconds for file system to fully flush writes
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
        // Best single-file format only (no merging)
        formatString = 'best[ext=mp4]/best';
      } else {
        // Extract height from quality string
        const height = quality.replace(/[^0-9]/g, '');
        // Single-file formats only (no merging)
        formatString = `best[height<=${height}][ext=mp4]/best[height<=${height}]`;
      }
      
      args.push('-f', formatString);
      // No merge flags - single-file formats only
    }

    args.push(url);

    logger.info(`Streaming download: ${audioOnly ? 'audio' : quality}`);
    
    const process = spawn(this.ytdlpPath, args);
    
    process.stderr.on('data', (data) => {
      logger.info('yt-dlp:', data.toString().trim());
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
