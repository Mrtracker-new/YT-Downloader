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
  private cacheTTL = 3 * 60 * 1000; // 3 minutes cache (faster updates)

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
      console.log(`[ytdlpService] Returning cached result for: ${url}`);
      logger.info('Returning cached video info');
      return Promise.resolve(cached.data);
    }

    return new Promise((resolve, reject) => {
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
        '--socket-timeout', '10',  // 10 second socket timeout
        '--retries', '3',  // Only retry 3 times
        '--fragment-retries', '3',  // Fragment retry limit
        '--no-call-home',  // Don't check for updates
        '--no-cache-dir',  // Don't use cache directory
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
            console.log(`[ytdlpService] Cached result for: ${url}`);
            
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
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
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
        '--prefer-ffmpeg',  // Prefer ffmpeg for merging video+audio
        '--concurrent-fragments', '5',  // Download 5 fragments concurrently
        '--buffer-size', '64K',  // Larger buffer for faster downloads
        '--retries', '5',  // Retry failed downloads
        '--fragment-retries', '5',  // Retry failed fragments
        '--no-call-home',  // Don't check for updates
        '--no-mtime',  // Don't use Last-modified header for speed
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
        
        // Prefer pre-merged MP4 formats (no ffmpeg needed), fallback to separate streams
        // Priority: 1) Pre-merged MP4 with video+audio, 2) Best video+audio merge, 3) Best overall
        const formatString = `best[height<=${height}][ext=mp4]/bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
        
        args.push('-f', formatString);
        args.push('--merge-output-format', 'mp4');  // Force output to MP4 format
        console.log(`[ytdlpService] Downloading with format: ${formatString}`);
        logger.info(`Downloading with format: ${formatString}`);
      }

      args.push(url);

      logger.info(`Starting yt-dlp download to: ${outputPath}`);

      const process = spawn(this.ytdlpPath, args);
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        logger.info('yt-dlp:', output.trim());
        
        // Parse progress information
        if (onProgress) {
          // Match progress pattern: [download]  45.2% of 10.5MiB at 2.3MiB/s ETA 00:03
          const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
          const speedMatch = output.match(/at\s+([\d\.]+[KMG]iB\/s)/);
          
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            const eta = etaMatch ? etaMatch[1] : 'Unknown';
            const speed = speedMatch ? speedMatch[1] : 'Unknown';
            onProgress(progress, eta, speed);
          }
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        const output = data.toString();
        const line = output.trim();
        if (line) logger.info('yt-dlp:', line);
        
        // Parse progress from stderr as well (yt-dlp sometimes outputs there)
        if (onProgress) {
          const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
          const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
          const speedMatch = output.match(/at\s+([\d\.]+[KMG]iB\/s)/);
          
          if (progressMatch) {
            const progress = parseFloat(progressMatch[1]);
            const eta = etaMatch ? etaMatch[1] : 'Unknown';
            const speed = speedMatch ? speedMatch[1] : 'Unknown';
            onProgress(progress, eta, speed);
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
