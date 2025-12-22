import ytdlpService from './ytdlpService';
import logger from '../utils/logger';

interface QueuedDownload {
    downloadId: string;
    url: string;
    quality: string;
    audioOnly: boolean;
    outputPath: string;
    onProgress?: (progress: number, eta: string, speed: string, status?: string) => void;
    onComplete?: (error?: Error) => void;
    addedAt: number;
    startedAt?: number;
    status: 'queued' | 'downloading' | 'completed' | 'failed';
    queuePosition?: number;
}

class DownloadQueue {
    private queue: QueuedDownload[] = [];
    private activeDownloads: Map<string, QueuedDownload> = new Map();
    private maxConcurrent: number;
    private maxQueueSize: number;
    private queueTimeout: number;

    constructor() {
        // Load configuration from environment variables
        this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '3');
        this.maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE || '20');
        this.queueTimeout = parseInt(process.env.QUEUE_TIMEOUT_MS || '300000'); // 5 minutes

        logger.info(`[DownloadQueue] Initialized with max concurrent: ${this.maxConcurrent}, max queue size: ${this.maxQueueSize}`);

        // Start cleanup interval for timed-out queued items
        setInterval(() => this.cleanupTimedOutDownloads(), 60000); // Check every minute
    }

    /**
     * Add a download to the queue
     */
    async addDownload(
        downloadId: string,
        url: string,
        quality: string,
        audioOnly: boolean,
        outputPath: string,
        onProgress?: (progress: number, eta: string, speed: string, status?: string) => void,
        onComplete?: (error?: Error) => void
    ): Promise<{ queued: boolean; position?: number; error?: string }> {
        // Check if queue is full
        if (this.queue.length >= this.maxQueueSize) {
            logger.warn(`[DownloadQueue] Queue is full (${this.queue.length}/${this.maxQueueSize})`);
            return { queued: false, error: 'Download queue is full. Please try again later.' };
        }

        // Add to queue
        const queuedDownload: QueuedDownload = {
            downloadId,
            url,
            quality,
            audioOnly,
            outputPath,
            onProgress,
            onComplete,
            addedAt: Date.now(),
            status: 'queued'
        };

        this.queue.push(queuedDownload);
        const position = this.queue.length;

        logger.info(`[DownloadQueue] Added download ${downloadId} to queue. Position: ${position}, Active: ${this.activeDownloads.size}/${this.maxConcurrent}`);

        // Try to process queue immediately
        this.processQueue();

        return { queued: true, position };
    }

    /**
     * Process the queue and start downloads if slots are available
     */
    private async processQueue(): Promise<void> {
        // Check if we can start more downloads
        while (this.activeDownloads.size < this.maxConcurrent && this.queue.length > 0) {
            const download = this.queue.shift();
            if (!download) break;

            // Update status and mark as active
            download.status = 'downloading';
            download.startedAt = Date.now();
            this.activeDownloads.set(download.downloadId, download);

            logger.info(`[DownloadQueue] Starting download ${download.downloadId}. Active: ${this.activeDownloads.size}/${this.maxConcurrent}, Queued: ${this.queue.length}`);

            // Start the download
            this.startDownload(download);
        }

        // Update queue positions for remaining items
        this.updateQueuePositions();
    }

    /**
     * Start an individual download
     */
    private async startDownload(download: QueuedDownload): Promise<void> {
        try {
            await ytdlpService.downloadVideo(
                download.url,
                download.quality,
                download.audioOnly,
                download.outputPath,
                download.onProgress
            );

            // Download completed successfully
            download.status = 'completed';
            logger.info(`[DownloadQueue] Download completed: ${download.downloadId}`);

            if (download.onComplete) {
                download.onComplete();
            }
        } catch (error) {
            // Download failed
            download.status = 'failed';
            logger.error(`[DownloadQueue] Download failed: ${download.downloadId}`, error);

            if (download.onComplete) {
                download.onComplete(error as Error);
            }
        } finally {
            // Remove from active downloads
            this.activeDownloads.delete(download.downloadId);

            logger.info(`[DownloadQueue] Removed from active downloads: ${download.downloadId}. Active: ${this.activeDownloads.size}/${this.maxConcurrent}`);

            // Process next item in queue
            this.processQueue();
        }
    }

    /**
     * Update queue positions for all queued items
     */
    private updateQueuePositions(): void {
        this.queue.forEach((download, index) => {
            download.queuePosition = index + 1;
        });
    }

    /**
     * Get queue status for a specific download
     */
    getQueueStatus(downloadId: string): {
        status: 'active' | 'queued' | 'not_found';
        position?: number;
        activeDownloads: number;
        totalQueued: number;
        estimatedWaitTime?: number;
    } {
        // Check if it's in active downloads
        if (this.activeDownloads.has(downloadId)) {
            return {
                status: 'active',
                activeDownloads: this.activeDownloads.size,
                totalQueued: this.queue.length
            };
        }

        // Check if it's in the queue
        const queueIndex = this.queue.findIndex(d => d.downloadId === downloadId);
        if (queueIndex !== -1) {
            const position = queueIndex + 1;
            // Rough estimate: assume 2 minutes per download on average
            const estimatedWaitTime = position * 120000; // milliseconds

            return {
                status: 'queued',
                position,
                activeDownloads: this.activeDownloads.size,
                totalQueued: this.queue.length,
                estimatedWaitTime
            };
        }

        return {
            status: 'not_found',
            activeDownloads: this.activeDownloads.size,
            totalQueued: this.queue.length
        };
    }

    /**
     * Get overall queue statistics
     */
    getStats(): {
        activeDownloads: number;
        queuedDownloads: number;
        maxConcurrent: number;
        maxQueueSize: number;
    } {
        return {
            activeDownloads: this.activeDownloads.size,
            queuedDownloads: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            maxQueueSize: this.maxQueueSize
        };
    }

    /**
     * Check if a download is complete
     * Returns true if download is completed or not found in active downloads
     * Returns false if download is still in progress
     */
    isDownloadComplete(downloadId: string): boolean {
        const download = this.activeDownloads.get(downloadId);

        // If not in active downloads, it's either completed or never existed
        if (!download) {
            return true;
        }

        // Check if status is completed
        return download.status === 'completed';
    }


    /**
     * Clean up downloads that have been in queue too long
     */
    private cleanupTimedOutDownloads(): void {
        const now = Date.now();
        const originalLength = this.queue.length;

        this.queue = this.queue.filter(download => {
            const timeInQueue = now - download.addedAt;
            if (timeInQueue > this.queueTimeout) {
                logger.warn(`[DownloadQueue] Removing timed-out download from queue: ${download.downloadId} (waited ${Math.round(timeInQueue / 1000)}s)`);

                if (download.onComplete) {
                    download.onComplete(new Error('Download request timed out in queue'));
                }
                return false;
            }
            return true;
        });

        const removed = originalLength - this.queue.length;
        if (removed > 0) {
            logger.info(`[DownloadQueue] Cleaned up ${removed} timed-out download(s)`);
            this.updateQueuePositions();
        }
    }

    /**
     * Remove a download from the queue (if not started yet)
     */
    cancelDownload(downloadId: string): boolean {
        const queueIndex = this.queue.findIndex(d => d.downloadId === downloadId);

        if (queueIndex !== -1) {
            const removed = this.queue.splice(queueIndex, 1)[0];
            logger.info(`[DownloadQueue] Cancelled queued download: ${downloadId}`);

            if (removed.onComplete) {
                removed.onComplete(new Error('Download cancelled by user'));
            }

            this.updateQueuePositions();
            return true;
        }

        return false;
    }
}

// Export singleton instance
export default new DownloadQueue();
