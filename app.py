#!/usr/bin/env python3
"""
This project is a YouTube video and audio downloader website built by Rolan using 
Flask, yt-dlp, and a modern frontend with HTML, CSS, and JavaScript. 
It allows users to fetch video details, choose quality options, and download content seamlessly. 
The site features a dark and light theme, a progress tracker, a download manager, 
and a user-friendly interface for a smooth experience.
"""

import os
import re
import time
import logging
import threading
import subprocess
import platform
import shutil
import random
from pathlib import Path
from threading import Lock, Event

from flask import Flask, jsonify, request, send_file, render_template, send_from_directory
from flask_cors import CORS
from yt_dlp import YoutubeDL

# -----------------------
# Flask App and Logging Configuration
# -----------------------

app = Flask(__name__)
CORS(app)

# Configure logging for the application
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
app.logger.setLevel(logging.INFO)

# -----------------------
# Configuration
# -----------------------

DOWNLOAD_DIR = str(Path.home() / "Downloads")
PREVIEW_DIR = os.path.join(os.getcwd(), 'previews')
COOKIE_FILE = os.path.join(os.getcwd(), 'cookies.txt')
PROXY_POOL = [
    'http://proxy1.example:8080',    # Replace with actual proxies
    'http://proxy2.example:8080',
    'socks5://user:pass@proxy3.example:1080'
]


# Ensure required directories exist
os.makedirs(PREVIEW_DIR, exist_ok=True)
app.logger.setLevel(logging.INFO)

# -----------------------
# Global Variables and Locks
# -----------------------

active_downloads = {}   # Maps download ID to DownloadThread instance
download_lock = Lock()  # Synchronizes access to active_downloads

# -----------------------
# FFmpeg Detection and Verification
# -----------------------

# Set a custom FFmpeg path if desired
CUSTOM_FFMPEG_PATH = r'C:\ffmpeg\bin\ffmpeg.exe'


def verify_ffmpeg(path):
    """Check if the FFmpeg binary at the given path is executable."""
    try:
        result = subprocess.run(
            [path, '-version'],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
        )
        return 'ffmpeg version' in result.stdout
    except Exception as e:
        app.logger.error(f"FFmpeg verification failed for {path}: {e}")
        return False


def find_ffmpeg():
    """
    Locate a working FFmpeg binary.
    Checks custom path, system PATH, and platform-specific fallback locations.
    """
    # Check custom path first
    if os.path.exists(CUSTOM_FFMPEG_PATH):
        if verify_ffmpeg(CUSTOM_FFMPEG_PATH):
            return CUSTOM_FFMPEG_PATH
        else:
            app.logger.error("Custom FFmpeg path exists but is not working properly")

    # Check if FFmpeg is in the system PATH
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == 'Windows' else 0
        )
        if 'ffmpeg version' in result.stdout:
            return 'ffmpeg'
    except Exception as e:
        app.logger.error(f"System PATH FFmpeg check failed: {e}")

    # Platform-specific fallback paths
    search_paths = {
        'Windows': [
            r'C:\ffmpeg\bin\ffmpeg.exe',
            r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
            r'C:\Tools\ffmpeg\bin\ffmpeg.exe'
        ],
        'Linux': [
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg'
        ],
        'Darwin': [
            '/opt/homebrew/bin/ffmpeg',
            '/usr/local/bin/ffmpeg'
        ]
    }

    for path in search_paths.get(platform.system(), []):
        if os.path.exists(path) and verify_ffmpeg(path):
            return path

    return None


FFMPEG_PATH = find_ffmpeg()

if FFMPEG_PATH:
    app.logger.info(f"✅ FFmpeg detected at: {FFMPEG_PATH}")
else:
    app.logger.error("❌ FFmpeg not found! Critical functionality disabled")

# -----------------------
# Enhanced Network Configuration
# -----------------------
def get_random_proxy():
    return random.choice(PROXY_POOL) if PROXY_POOL else None

def get_random_user_agent():
    agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
        'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36'
    ]
    return random.choice(agents)
# -----------------------
# Utility Functions
# -----------------------

def sanitize_filename(name):
    """
    Remove potentially unsafe characters from filenames.
    """
    return re.sub(r'[\\/*?:"<>|]', '', str(name)).strip()

def normalize_youtube_url(url):
    replacements = [
        ('m.youtube.com', 'www.youtube.com'),
        ('youtube-nocookie.com', 'youtube.com'),
        ('/embed/', '/watch?v='),
        ('youtu.be/', 'youtube.com/watch?v=')
    ]
    for old, new in replacements:
        url = url.replace(old, new)
    return url

def validate_url(url):
    patterns = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=[\w-]{11}',
        r'(?:https?://)?youtu\.be/[\w-]{11}'
    ]
    return any(re.match(p, url) for p in patterns)

def validate_url(url):
    """
    Validate that the provided URL is a valid YouTube URL.
    """
    youtube_regex = (
        r'(https?://)?(www\.)?'
        r'(youtube|youtu|youtube-nocookie)\.(com|be)/'
        r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
    )
    return re.match(youtube_regex, url) is not None


# Mapping of resolution labels to their height in pixels
RESOLUTION_MAP = {
    '144p': 144,
    '240p': 240,
    '360p': 360,
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '1440p': 1440,
    '4K': 2160,
    '8K': 4320
}


def get_ydl_options(base=False):
    options = {
        'user_agent': get_random_user_agent(),
        'referer': 'https://www.youtube.com/',
        'http_headers': {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        },
        'proxy': get_random_proxy(),
        'rate_limit': 1024 * 50,  # 50 KB/s
        'retries': 20,
        'throttled_rate': '100K',
        'randomize_range': True,
        'no_check_certificate': True,
        'compat_opts': ['no-youtube-unavailable-videos'],
        'wait_for_video': (5, 60),
        'sleep_interval': 15,
        'max_sleep_interval': 30,
    }

    if os.path.exists(COOKIE_FILE):
        options.update({
            'cookiefile': COOKIE_FILE,
            'cookiesfrombrowser': ('chrome',)
        })

    if not base:
        options.update({
            'noplaylist': True,
            'ignoreerrors': 'only_download',
            'extractor_args': {'youtube': {'skip': ['dash', 'hls']}},
        })

    return options
# -----------------------
# Background Task: Preview Cleanup
# -----------------------

def cleanup_previews():
    """
    Periodically clean up old preview files (older than 1 hour).
    """
    while True:
        try:
            now = time.time()
            for filename in os.listdir(PREVIEW_DIR):
                file_path = os.path.join(PREVIEW_DIR, filename)
                if os.path.isfile(file_path):
                    if now - os.path.getmtime(file_path) > 3600:
                        os.remove(file_path)
                        app.logger.info(f"Removed old preview file: {file_path}")
        except Exception as e:
            app.logger.error(f"Error during preview cleanup: {e}")
        time.sleep(3600)

# -----------------------
# DownloadThread Class
# -----------------------

class DownloadThread(threading.Thread):
    """
    Thread to handle background downloading using yt-dlp.
    Provides pause, resume, and cancel functionality along with progress reporting.
    """
    def __init__(self, download_id, url, options):
        super().__init__()
        self.download_id = download_id
        self.url = url
        self.options = options
        self.progress = {
            'status': 'queued',
            'percent': 0,
            'speed': '0 KiB/s',
            'eta': '--:--',
            'filename': None
        }
        self._lock = Lock()
        self._paused = Event()
        self._cancelled = Event()
        self._done = Event()
        self._ydl = None
        self.final_path = None

    def run(self):
        try:
            app.logger.info(f"Download {self.download_id} started for URL: {self.url}")
            # Copy options and add progress hook
            ydl_opts = self.options.copy()
            ydl_opts['progress_hooks'] = [self._progress_hook]
            ydl_opts.update(get_ydl_options(base=True))


            # Register self in the active downloads dict
            with download_lock:
                active_downloads[self.download_id] = self

            with YoutubeDL(ydl_opts) as self._ydl:
                # Random delay before download
                time.sleep(random.randint(2, 10))
                info = self._ydl.extract_info(self.url, download=True)

                # Check if the download was cancelled
                if self._cancelled.is_set():
                    raise Exception("Download cancelled by user")

                # Determine final filename
                final_file = None
                if '_filename' in info:
                    final_file = os.path.basename(info['_filename'])
                else:
                    # Fallback: search for a file that includes the download_id in its name
                    for f in os.listdir(DOWNLOAD_DIR):
                        if self.download_id in f:
                            final_file = f
                            break

                if not final_file:
                    raise Exception("Failed to locate downloaded file")

                final_path = os.path.join(DOWNLOAD_DIR, final_file)
                if not os.path.exists(final_path):
                    raise Exception("Downloaded file not found")

                self.final_path = final_path

                with self._lock:
                    self.progress.update({
                        'status': 'completed',
                        'filename': final_file,
                        'percent': 100
                    })
                    app.logger.info(f"Download {self.download_id} completed: {final_file}")

        except Exception as e:
            with self._lock:
                # Differentiate between user cancellation and other errors
                self.progress.update({
                    'status': 'cancelled' if self._cancelled.is_set() else 'error',
                    'message': str(e)
                })
                app.logger.error(f"Download {self.download_id} error: {e}")
        finally:
            self._done.set()
            self.cleanup()
            with download_lock:
                active_downloads.pop(self.download_id, None)

    def _progress_hook(self, d):
        """
        Hook to update progress information provided by yt-dlp.
        """
        if d.get('status') == 'finished':
            with self._lock:
                self.progress['percent'] = 100
                self.progress['status'] = 'completed'
            return

        if self._cancelled.is_set():
            raise Exception("Download cancelled by user")

        # Pause handling: wait until the download is resumed
        if self._paused.is_set():
            while self._paused.is_set() and not self._cancelled.is_set():
                time.sleep(0.5)

        if d.get('status') == 'downloading':
            with self._lock:
                try:
                    percent_str = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_percent_str', '0%')).strip().replace('%', '')
                    percent = float(percent_str)
                except ValueError:
                    percent = 0
                self.progress['percent'] = percent
                self.progress['speed'] = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_speed_str', 'N/A'))
                self.progress['eta'] = re.sub(r'\x1b\[[0-9;]*m', '', d.get('_eta_str', 'N/A'))
                self.progress['status'] = 'downloading'

    def pause(self):
        with self._lock:
            self._paused.set()
            self.progress['status'] = 'paused'
            app.logger.info(f"Download {self.download_id} paused.")

    def resume(self):
        with self._lock:
            self._paused.clear()
            self.progress['status'] = 'downloading'
            app.logger.info(f"Download {self.download_id} resumed.")

    def cancel(self):
        with self._lock:
            self._cancelled.set()
            self.progress['status'] = 'cancelled'
            app.logger.info(f"Download {self.download_id} cancelled by user.")
            self.cleanup()

    def cleanup(self):
        """
        Clean up partial files if the download did not complete.
        """
        filename = self.progress.get('filename')
        if filename and self.progress.get('status') not in ['completed']:
            file_path = os.path.join(DOWNLOAD_DIR, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    app.logger.info(f"Cleaned up incomplete file: {file_path}")
                except Exception as e:
                    app.logger.error(f"Cleanup error for {file_path}: {e}")


# -----------------------
# Request Middleware
# -----------------------
@app.before_request
def randomize_request_pattern():
    # Add random delay (0.5-3 seconds)
    time.sleep(random.uniform(0.5, 3.0))
    
    # Randomize TLS fingerprint
    os.environ['curl_ca_bundle'] = random.choice([
        '/etc/ssl/certs/ca-certificates.crt',
        '/usr/lib/ssl/cert.pem',
        '/etc/pki/tls/certs/ca-bundle.crt'
    ])

# -----------------------
# Routes and Endpoints
# -----------------------

@app.route('/')
def home():
    """Render the main interface."""
    return render_template('index.html')


@app.route('/api/preview', methods=['POST'])
def generate_preview():
    """
    Generate a 30-second preview for the provided URL.
    Accepts JSON with keys: url and (optional) type (audio/video).
    """
    try:
        data = request.json
        url = data['url']
        preview_type = data.get('type', 'video')
        app.logger.info(f"Generating preview for URL: {url} as {preview_type}")

        ydl_opts = {
            'format': 'bestaudio/best' if preview_type == 'audio' else 'bestvideo[height<=360]',
            'outtmpl': os.path.join(PREVIEW_DIR, f'preview_{int(time.time())}_%(id)s.%(ext)s'),
            'quiet': True,
            'noplaylist': True,
            'postprocessor_args': ['-t', '30'],  # Limit preview duration to 30 seconds
            'ffmpeg_location': FFMPEG_PATH,
        }

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            preview_path = os.path.join(PREVIEW_DIR, os.path.basename(filename))

        return jsonify({'preview_url': f'/preview/{os.path.basename(preview_path)}'})
    except Exception as e:
        app.logger.error(f"Preview generation error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/preview/<filename>')
def serve_preview(filename):
    """Serve the generated preview file."""
    return send_from_directory(PREVIEW_DIR, filename, conditional=True)


@app.route('/api/info', methods=['POST'])
def get_info():
    """
    Retrieve video information and available formats for the provided URL.
    Accepts JSON with key: url.
    """
    try:
        raw_url = request.json.get('url')
        url = request.json.get('url')
        if not validate_url(url):
            return jsonify({'error': 'Invalid YouTube URL'}), 400

        app.logger.info(f"Fetching info for URL: {url}")
        ydl_opts = get_ydl_options()
        ydl_opts = {
            'quiet': True,
            'no_warnings': False,
            'extract_flat': True,
            'force_generic_extractor': True,
            'cachedir': False,
            'rm_cache': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-site',
            },
            'retries': 10,
            'fragment_retries': 10,
            'ignoreerrors': False,
            'no_check_certificate': True,
            'force_ipv4': True,
        }

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = info.get('formats', [])
        # Filter video and audio formats
        video_formats = sorted(
            [f for f in formats if f.get('vcodec') != 'none' and f.get('height')],
            key=lambda x: (-x['height'], -x.get('fps', 0), -x.get('tbr', 0))
        )
        audio_formats = sorted(
            [f for f in formats if f.get('acodec') != 'none' and f.get('abr')],
            key=lambda x: (-x['abr'], -x.get('asr', 0))
        )

        video_options = []
        for name, res in RESOLUTION_MAP.items():
            matches = [f for f in video_formats if f.get('height') == res]
            if matches:
                best_match = max(matches, key=lambda x: x.get('tbr', 0))
                video_options.append({
                    'id': best_match['format_id'],
                    'resolution': name,
                    'height': res,
                    'ext': best_match['ext'],
                    'filesize': best_match.get('filesize'),
                    'fps': best_match.get('fps')
                })

        audio_options = []
        for fmt in audio_formats:
            audio_options.append({
                'id': fmt['format_id'],
                'abr': fmt['abr'],
                'ext': fmt['ext'],
                'filesize': fmt.get('filesize'),
                'bitrate': f"{fmt['abr']}kbps"
            })

        return jsonify({
            'id': info['id'],
            'title': info['title'],
            'duration': info.get('duration'),
            'thumbnail': info.get('thumbnail'),
            'video_formats': video_options,
            'audio_formats': audio_options
        })

    except Exception as e:
        app.logger.error(f"Error fetching video info: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['POST'])
def start_download():
    """
    Start a download task for the provided URL and desired quality.
    Accepts JSON with keys: url, type (audio/video), and quality.
    """
    data = request.json
    download_id = f"dl_{os.urandom(4).hex()}"
    app.logger.info(f"Starting download {download_id} for URL: {data.get('url')}")

    try:
        ydl_opts = get_ydl_options()
        ydl_opts = {
            'outtmpl': os.path.join(DOWNLOAD_DIR, f'%(title)s_{download_id}.%(ext)s'),
            'quiet': True,
            'noplaylist': True,
            'ffmpeg_location': FFMPEG_PATH,
            'cachedir': False,
            'rm_cache': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'retries': 10,
            'fragment_retries': 10,
            'ignoreerrors': False,
            'no_check_certificate': True,
            'force_ipv4': True,
        }

        if data['type'] == 'audio':
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '320'
                }]
            })
        else:
            # Use the provided quality or default to 720p
            height = RESOLUTION_MAP.get(data.get('quality', '720p'), 720)
            ydl_opts.update({
                'format': f'bestvideo[height={height}]+bestaudio/best',
                'merge_output_format': 'mp4'
            })

        thread = DownloadThread(download_id, data['url'], ydl_opts)
        thread.start()

        return jsonify({'id': download_id})
    except Exception as e:
        app.logger.error(f"Error starting download {download_id}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/progress/<download_id>')
def get_progress(download_id):
    """
    Retrieve progress information for an active download.
    """
    with download_lock:
        download = active_downloads.get(download_id)

    if not download:
        return jsonify({'status': 'completed'})

    with download._lock:
        return jsonify(download.progress)


@app.route('/api/download/<download_id>/<action>', methods=['POST'])
def control_download(download_id, action):
    """
    Control an active download (pause, resume, or cancel).
    """
    with download_lock:
        download = active_downloads.get(download_id)

    if not download:
        return jsonify({'error': 'Download not found'}), 404

    try:
        if action == 'pause':
            download.pause()
        elif action == 'resume':
            download.resume()
        elif action == 'cancel':
            download.cancel()
        else:
            return jsonify({'error': 'Invalid action'}), 400

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error controlling download {download_id} with action {action}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/download/<filename>')
def serve_file(filename):
    """
    Serve a completed download file to the client.
    """
    try:
        # Block invalid filename requests
        if filename.lower() in ['null', 'none', 'undefined']:
            app.logger.warning(f"Blocked invalid filename request: {filename}")
            return jsonify({'error': 'Invalid filename'}), 400

        safe_filename = sanitize_filename(filename)
        safe_path = os.path.join(DOWNLOAD_DIR, safe_filename)

        if not os.path.exists(safe_path):
            app.logger.error(f"File not found: {safe_filename}")
            return jsonify({'error': 'File not found'}), 404

        app.logger.info(f"Serving file: {safe_filename}")
        return send_file(
            safe_path,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        app.logger.error(f"Error serving file {filename}: {e}")
        return jsonify({'error': str(e)}), 500

# -----------------------
# Main Entry Point
# -----------------------

if __name__ == '__main__':
    # Start the background thread for cleaning up preview files
    threading.Thread(target=cleanup_previews, daemon=True).start()
    app.logger.info("Starting Flask app on host 0.0.0.0, port 5000")
    app.run(host='0.0.0.0', port=5000, threaded=True)
