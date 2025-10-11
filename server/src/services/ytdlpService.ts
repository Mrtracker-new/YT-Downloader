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
      // Fallback to mobile web client if no cookies
      args.push('--extractor-args', 'youtube:player_client=mweb');
      args.push('--user-agent', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36');
      console.log('[ytdlpService] Using mobile web client (no cookies)');
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
        '--no-call-home',  // Don't check for updates
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
        '--no-warnings',
        '--no-playlist',
        '--newline',  // Important: Output progress on new lines for parsing
        '--progress',  // Show progress
        '--console-title',  // Output progress to console
        '--prefer-ffmpeg',  // Prefer ffmpeg for merging video+audio
        '--buffer-size', '32K',  // Optimized buffer size for speed
        '--http-chunk-size', '10M',  // Download in larger chunks (faster)
        '--retries', '3',  // Retry failed downloads
        '--fragment-retries', '3',  // Retry failed fragments
        '--no-call-home',  // Don't check for updates
        '--concurrent-fragments', '5',  // Download 5 fragments in parallel
        '--throttled-rate', '100K',  // Minimum download rate threshold
        '--no-part',  // Don't use .part files (slightly faster)
        ...this.getCommonArgs(),
        '-o', outputPath
      ];

      if (audioOnly) {
        // Extract audio and convert to MP3
        args.push('-x');  // Extract audio only
        args.push('--audio-format', 'mp3');  // Convert to MP3
        args.push('--audio-quality', '0');  // Best audio quality
        args.push('--embed-thumbnail');  // Embed album art if available
        console.log('[ytdlpService] Downloading audio as MP3');
        logger.info('Downloading audio as MP3');
      } else {
        // Download video at specified quality
        // Extract height from quality string (e.g., "720p" -> "720")
        const height = quality.replace('p', '');
        
        // Simple, reliable format selection for playable videos
        // Download best video+audio and merge properly
        const formatString = `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`;
        
        args.push('-f', formatString);
        args.push('--merge-output-format', 'mp4');  // Force merge to MP4
        args.push('--postprocessor-args', 'ffmpeg:-movflags +faststart');  // Enable fast start for web playback
        console.log(`[ytdlpService] Downloading with format: ${formatString}`);
        logger.info(`Downloading with format: ${formatString}`);
      }

      args.push(url);

      logger.info(`Starting yt-dlp download to: ${outputPath}`);

      const process = spawn(this.ytdlpPath, args);
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n');
        
        // Process each line separately for better parsing
        for (const line of lines) {
          if (line.trim()) {
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

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        const output = data.toString();
        const lines = output.split('\n');
        
        // Process each line separately for better parsing
        for (const line of lines) {
          if (line.trim()) {
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

      process.on('close', (code) => {
        if (code === 0) {
          logger.info('yt-dlp download completed successfully');
          if (onProgress) onProgress(100, '00:00', 'Complete');
          resolve(outputPath);
        } else {
          logger.error('yt-dlp failed:', stderr);
          reject(new Error(`Download failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
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
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
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
