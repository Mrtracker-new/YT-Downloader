/**
 * Smart Notifications Utility
 * Handles desktop notifications, sound alerts, and notification preferences
 */

export interface NotificationSettings {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
}

const STORAGE_KEY = 'yt-downloader-notifications';

/**
 * Get notification settings from localStorage
 */
export const getNotificationSettings = (): NotificationSettings => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load notification settings:', error);
    }

    // Default settings
    return {
        enabled: true,
        sound: true,
        desktop: true,
    };
};

/**
 * Save notification settings to localStorage
 */
export const saveNotificationSettings = (settings: NotificationSettings): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save notification settings:', error);
    }
};

/**
 * Request desktop notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
};

/**
 * Play notification sound
 */
export const playNotificationSound = (): void => {
    try {
        // Create a simple notification sound using Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Create a pleasant notification sound (two-tone)
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);

        // Second tone
        setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();

            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);

            oscillator2.frequency.value = 1000;
            oscillator2.type = 'sine';

            gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.2);
        }, 250);
    } catch (error) {
        console.error('Failed to play notification sound:', error);
    }
};

/**
 * Show desktop notification
 */
export const showDesktopNotification = async (
    title: string,
    options?: NotificationOptions
): Promise<Notification | null> => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        console.warn('Desktop notification permission not granted');
        return null;
    }

    try {
        const notification = new Notification(title, {
            icon: '/YT.png',
            badge: '/YT.png',
            ...options,
        });

        return notification;
    } catch (error) {
        console.error('Failed to show desktop notification:', error);
        return null;
    }
};

/**
 * Main notification function - shows desktop notification and plays sound based on settings
 */
export const notify = async (
    title: string,
    body: string,
    options?: {
        icon?: string;
        thumbnail?: string;
        onClick?: () => void;
    }
): Promise<void> => {
    const settings = getNotificationSettings();

    if (!settings.enabled) {
        return;
    }

    // Play sound if enabled
    if (settings.sound) {
        playNotificationSound();
    }

    // Show desktop notification if enabled
    if (settings.desktop) {
        const notification = await showDesktopNotification(title, {
            body,
            icon: options?.thumbnail || options?.icon || '/YT.png',
            tag: 'yt-downloader',
            requireInteraction: false,
        });

        if (notification && options?.onClick) {
            notification.onclick = () => {
                options.onClick?.();
                notification.close();
                window.focus();
            };
        }
    }
};

/**
 * Notify download completion
 */
export const notifyDownloadComplete = async (
    videoTitle: string,
    thumbnail?: string,
    audioOnly?: boolean
): Promise<void> => {
    const type = audioOnly ? 'Audio' : 'Video';
    await notify(
        `${type} Download Complete! 🎉`,
        videoTitle,
        {
            thumbnail,
            onClick: () => {
                // Focus the window when notification is clicked
                console.log('Notification clicked - focusing window');
            },
        }
    );
};

/**
 * Notify download failed
 */
export const notifyDownloadFailed = async (
    videoTitle: string,
    errorMessage?: string
): Promise<void> => {
    await notify(
        'Download Failed ❌',
        errorMessage || `Could not download: ${videoTitle}`,
        {
            onClick: () => {
                console.log('Failed notification clicked');
            },
        }
    );
};

/**
 * Check if notifications are supported
 */
export const areNotificationsSupported = (): boolean => {
    return 'Notification' in window;
};

/**
 * Get current permission status
 */
export const getNotificationPermissionStatus = (): NotificationPermission => {
    if (!areNotificationsSupported()) {
        return 'denied';
    }
    return Notification.permission;
};
