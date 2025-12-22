import { UrlValidator } from '../utils/validators';
import logger from '../utils/logger';
import ytdlpService from './ytdlpService';

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: string;
  thumbnail: string;
  description: string;
  formats: VideoFormat[];
  availableQualities?: string[]; // Available video quality options
}

export interface VideoFormat {
  itag: number;
  quality: string;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  qualityLabel?: string;
  audioQuality?: string;
  contentLength?: string;
}

class VideoService {
  /**
   * Get video information from YouTube URL
   */
  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      // Validate URL
      try {
        UrlValidator.validate(url);
      } catch (error) {
        throw new Error('Invalid YouTube URL');
      }

      logger.info(`Fetching video info for: ${url}`);

      // Get video info using yt-dlp
      const info = await ytdlpService.getVideoInfo(url);

      // Map yt-dlp formats to our VideoFormat interface
      const availableFormats: VideoFormat[] = info.formats.map((format: any) => {
        const hasVideo = !!format.vcodec && format.vcodec !== 'none';
        const hasAudio = !!format.acodec && format.acodec !== 'none';

        // Extract quality label - use height if available for video formats
        let qualityLabel: string | undefined;
        if (hasVideo && format.height) {
          // Include fps in label if it's high frame rate (>30fps)
          const fps = format.fps || 30;
          qualityLabel = fps > 30 ? `${format.height}p${fps}` : `${format.height}p`;
        } else if (hasVideo) {
          qualityLabel = format.quality || undefined;
        }

        return {
          itag: parseInt(format.format_id) || 0,
          quality: format.quality || 'unknown',
          container: format.ext || 'unknown',
          hasVideo,
          hasAudio,
          qualityLabel,
          audioQuality: format.acodec || undefined,
          contentLength: format.filesize?.toString() || undefined,
        };
      });

      // Extract unique video qualities from formats
      const videoQualities = [...new Set(
        availableFormats
          .filter(f => f.hasVideo && f.qualityLabel)
          .map(f => {
            // Extract height from qualityLabel (e.g., "720p60" -> "720")
            const match = f.qualityLabel!.match(/\d+/);
            return match ? parseInt(match[0]) : null;
          })
          .filter(h => h !== null)
      )] as number[];

      // Sort qualities in descending order and convert to quality labels
      const sortedQualities = videoQualities
        .sort((a, b) => b - a)
        .map(h => `${h}p`);

      const videoInfo: VideoInfo = {
        videoId: info.id,
        title: info.title,
        author: info.uploader,
        lengthSeconds: info.duration.toString(),
        thumbnail: info.thumbnail,
        description: info.description,
        formats: availableFormats,
        availableQualities: sortedQualities, // Add actual available qualities
      };

      logger.info(`Successfully fetched info for: ${info.title}`);
      return videoInfo;
    } catch (error) {
      logger.error('Error fetching video info:', error);
      throw new Error(`Failed to fetch video information: ${(error as Error).message}`);
    }
  }

  /**
   * Get best format based on quality preference
   */
  getBestFormat(formats: VideoFormat[], quality: string, audioOnly: boolean): VideoFormat | null {
    try {
      if (audioOnly) {
        // For audio, find highest quality audio format
        const audioFormats = formats.filter(f => f.hasAudio);
        if (audioFormats.length === 0) return null;

        // Sort by quality and return best
        return audioFormats.sort((a, b) => {
          const aSize = parseInt(a.contentLength || '0');
          const bSize = parseInt(b.contentLength || '0');
          return bSize - aSize;
        })[0];
      }

      // For video, try to find format with both video and audio first
      let videoFormats = formats.filter(f =>
        f.hasVideo &&
        f.hasAudio &&
        f.qualityLabel?.toLowerCase().includes(quality.toLowerCase())
      );

      // If no combined format found, try any format with both video and audio
      if (videoFormats.length === 0) {
        videoFormats = formats.filter(f => f.hasVideo && f.hasAudio);
      }

      // If still no format found, get the best video-only format
      if (videoFormats.length === 0) {
        videoFormats = formats.filter(f =>
          f.hasVideo &&
          f.qualityLabel?.toLowerCase().includes(quality.toLowerCase())
        );

        if (videoFormats.length === 0) {
          // Last resort: get highest quality video
          videoFormats = formats.filter(f => f.hasVideo);
        }
      }

      return videoFormats.length > 0 ? videoFormats[0] : null;
    } catch (error) {
      logger.error('Error selecting format:', error);
      return null;
    }
  }

  /**
   * Get download stream for a video (deprecated - use ytdlpService directly)
   */
  getDownloadStream(url: string, quality: string, audioOnly: boolean) {
    logger.warn('getDownloadStream is deprecated, use ytdlpService directly');
    throw new Error('This method is deprecated. Use ytdlpService for downloads.');
  }

  /**
   * Validate if video is available for download
   */
  async validateVideo(url: string): Promise<boolean> {
    try {
      try {
        UrlValidator.validate(url);
      } catch (error) {
        return false;
      }

      const valid = await ytdlpService.validateUrl(url);
      return valid;
    } catch (error) {
      logger.error('Error validating video:', error);
      return false;
    }
  }
}

export default new VideoService();
