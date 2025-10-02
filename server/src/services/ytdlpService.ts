import { spawn } from 'child_process';
import { dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';
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
  private ytdlpPath = 'C:\\Users\\rolan\\AppData\\Local\\Microsoft\\WinGet\\Links\\yt-dlp.exe';

  /**
   * Get video information using yt-dlp
   */
  async getVideoInfo(url: string): Promise<YtDlpVideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '--dump-json',
        '--no-warnings',
        url
      ];

      let output = '';
      const process = spawn(this.ytdlpPath, args);

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        logger.error('yt-dlp stderr:', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
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

            resolve(videoInfo);
          } catch (error) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
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
        '-o', outputPath
      ];

      if (audioOnly) {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else {
        // Download video at specified quality
        // Extract height from quality string (e.g., "720p" -> "720")
        const height = quality.replace('p', '');
        
        // Format string: Download video at specified height with best audio, merge if needed
        // Fallback to best available if specified quality not available
        const formatString = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`;
        
        args.push('-f', formatString);
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
    const args = ['--no-warnings', '--no-playlist', '-o', '-'];

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
      await this.getVideoInfo(url);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new YtDlpService();
