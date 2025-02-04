class YouTubeDownloader {
  constructor() {
    // Store the current active download ID and download history (persisted via localStorage)
    this.currentDownloadId = null;
    this.downloadHistory = JSON.parse(localStorage.getItem('downloadHistory')) || [];

    // Initialize UI event listeners, theme and typewriter animation
    this.initializeEventListeners();
    this.initializeTheme();
    this.initializeTypewriterEffect();

    console.info("YouTubeDownloader initialized.");
  }

  // ---------------------------
  // Initialization Functions
  // ---------------------------

  initializeEventListeners() {
    // Bind UI elements to methods
    document.getElementById('analyzeBtn').addEventListener('click', () => this.getVideoInfo());
    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('showHistory').addEventListener('click', () => this.toggleHistoryPanel());
    document.getElementById('urlInput').addEventListener('input', (e) => this.validateURL(e.target.value));

    // Delegate click events for dynamically added elements
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quality-option')) this.handleQualitySelection(e);
      if (e.target.closest('.history-close')) this.toggleHistoryPanel();
      if (e.target.closest('.download-item')) this.handleHistoryClick(e);
    });
  }

  initializeTheme() {
    // Use a saved theme or default to 'dark'
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.info(`Theme set to ${savedTheme}.`);
  }

  toggleTheme() {
    // Toggle between dark and light themes
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.info(`Theme changed to ${newTheme}.`);
  }

  initializeTypewriterEffect() {
    // Cycle through phrases with a typewriter effect
    const phrases = ['4K Videos', 'High Quality Audio', 'Playlists', 'Subtitles'];
    const element = document.getElementById('typewriter');
    let index = 0;
    let currentText = '';
    let isDeleting = false;

    const type = () => {
      const fullText = phrases[index];

      // Update currentText based on whether we are deleting or adding
      if (isDeleting) {
        currentText = fullText.substring(0, currentText.length - 1);
      } else {
        currentText = fullText.substring(0, currentText.length + 1);
      }

      element.textContent = currentText;
      let typeSpeed = 100;
      if (isDeleting) typeSpeed /= 2;

      if (!isDeleting && currentText === fullText) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && currentText === '') {
        isDeleting = false;
        index = (index + 1) % phrases.length;
      }
      setTimeout(type, typeSpeed);
    };

    type();
  }

  // ---------------------------
  // URL Validation and Video Info
  // ---------------------------

  validateURL(url) {
    const isValid = this.isValidYouTubeUrl(url);
    document.getElementById('urlInput').classList.toggle('invalid', !isValid);
    return isValid;
  }

  isValidYouTubeUrl(url) {
    // Regular expression to match a YouTube URL
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%\?]{11})/;
    return pattern.test(url);
  }

  async getVideoInfo() {
    const urlInput = document.getElementById('urlInput');
    const videoInfo = document.getElementById('videoInfo');

    if (!this.validateURL(urlInput.value)) {
      this.showError('Please enter a valid YouTube URL');
      return;
    }

    // Show a loading spinner while analyzing
    videoInfo.innerHTML = this.createLoadingSpinner('Analyzing video...');
    console.info(`Analyzing video: ${urlInput.value}`);

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.value })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Display video information and available formats
      this.showVideoInfo(data);
      console.info("Video info received:", data);
    } catch (error) {
      console.error("Error fetching video info:", error);
      this.showError(error.message);
    }
  }

  showVideoInfo(info) {
    const videoInfo = document.getElementById('videoInfo');
    videoInfo.innerHTML = `
      <div class="video-card">
        <div class="thumbnail-container">
          <img src="${info.thumbnail}" class="thumbnail" alt="Video thumbnail">
          <div class="meta-overlay">
            <span class="duration">${this.formatDuration(info.duration)}</span>
          </div>
        </div>
        <h2>${info.title}</h2>
        <div class="preview-buttons">
          <button class="gradient-btn" onclick="downloader.generatePreview('video')">
            <i class="fas fa-film"></i> Video Preview
          </button>
          <button class="gradient-btn" onclick="downloader.generatePreview('audio')">
            <i class="fas fa-music"></i> Audio Preview
          </button>
        </div>
        <div class="quality-selection">
          <div class="quality-section">
            <h3><i class="fas fa-video"></i> Video Formats</h3>
            <div class="quality-grid">
              ${info.video_formats.map(format => this.createFormatCard(format, 'video')).join('')}
            </div>
          </div>
          <div class="quality-section">
            <h3><i class="fas fa-music"></i> Audio Formats</h3>
            <div class="quality-grid">
              ${info.audio_formats.map(format => this.createFormatCard(format, 'audio')).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------
  // Preview Generation
  // ---------------------------

  async generatePreview(type) {
    console.info(`Generating ${type} preview...`);
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: document.getElementById('urlInput').value,
          type: type
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Show the preview player overlay
      this.showPreviewPlayer(data.preview_url, type);
      console.info(`Preview generated: ${data.preview_url}`);
    } catch (error) {
      console.error("Error generating preview:", error);
      this.showError(error.message);
    }
  }

  showPreviewPlayer(url, type) {
    const playerHTML = `
      <div class="preview-player">
        ${
          type === 'audio'
            ? `<audio controls autoplay>
                 <source src="${url}" type="audio/mpeg">
                 Your browser does not support audio preview
               </audio>`
            : `<video controls autoplay>
                 <source src="${url}" type="video/mp4">
                 Your browser does not support video preview
               </video>`
        }
        <button class="close-preview" onclick="this.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', playerHTML);
  }

  // ---------------------------
  // Format Cards and Selection
  // ---------------------------

  createFormatCard(format, type) {
    return `
      <div class="quality-option ${type}-option" data-quality="${type === 'video' ? format.resolution : format.abr}">
        <div class="quality-header">
          <span class="quality-badge ${type}">${type === 'video' ? format.resolution : 'MP3'}</span>
          <span class="quality-size">${this.formatFileSize(format.filesize)}</span>
        </div>
        <div class="quality-details">
          ${
            type === 'video'
              ? `<span>${format.ext.toUpperCase()}</span>
                 ${format.fps ? `<span>${format.fps}fps</span>` : ''}`
              : `<span>${format.bitrate}</span>
                 <span>${format.ext.toUpperCase()}</span>`
          }
        </div>
        <div class="quality-hover">
          <i class="fas fa-download"></i>
        </div>
      </div>
    `;
  }

  handleQualitySelection(event) {
    const option = event.target.closest('.quality-option');
    const type = option.classList.contains('audio-option') ? 'audio' : 'video';
    const quality = option.dataset.quality;
    console.info(`Quality selected: ${type}, ${quality}`);
    this.startDownload(type, quality);
  }

  // ---------------------------
  // Download Initiation and Progress
  // ---------------------------

  async startDownload(type, quality) {
    const downloadProgress = document.getElementById('downloadProgress');
    downloadProgress.innerHTML = this.createProgressContainer();

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: document.getElementById('urlInput').value,
          type: type,
          quality: quality
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      this.currentDownloadId = data.id;
      console.info(`Download started with ID: ${this.currentDownloadId}`);
      this.monitorProgress();
    } catch (error) {
      console.error("Error starting download:", error);
      this.showError(error.message);
    }
  }

  createProgressContainer() {
    return `
      <div class="progress-container" id="activeDownload">
        <div class="progress-content">
          <div class="circular-progress">
            <svg>
              <circle class="progress-ring" cx="50" cy="50" r="45" />
            </svg>
            <div class="progress-percent">0%</div>
          </div>
          <div class="progress-details">
            <div class="progress-text">Initializing download...</div>
            <div class="progress-stats">
              <span><i class="fas fa-tachometer-alt"></i> <span class="speed">0 KB/s</span></span>
              <span><i class="fas fa-clock"></i> <span class="eta">--:--</span></span>
            </div>
          </div>
        </div>
        <div class="download-controls">
          <button class="control-btn pause" onclick="downloader.controlDownload('pause')">
            <i class="fas fa-pause"></i> Pause
          </button>
          <button class="control-btn resume" style="display:none;" onclick="downloader.controlDownload('resume')">
            <i class="fas fa-play"></i> Resume
          </button>
          <button class="control-btn cancel" onclick="downloader.controlDownload('cancel')">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      </div>
    `;
  }

  async controlDownload(action) {
    if (!this.currentDownloadId) {
      this.showError("No active download.");
      return;
    }

    try {
      const response = await fetch(`/api/download/${this.currentDownloadId}/${action}`, {
        method: 'POST'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Control action failed');
      }
      console.info(`Download ${this.currentDownloadId} ${action}d successfully.`);

      // Update UI state based on action
      const progressContainer = document.getElementById('activeDownload');
      if (progressContainer) {
        switch (action) {
          case 'pause':
            progressContainer.querySelector('.pause').style.display = 'none';
            progressContainer.querySelector('.resume').style.display = 'inline-block';
            break;
          case 'resume':
            progressContainer.querySelector('.resume').style.display = 'none';
            progressContainer.querySelector('.pause').style.display = 'inline-block';
            break;
          case 'cancel':
            progressContainer.remove();
            this.currentDownloadId = null;
            break;
        }
      }
    } catch (error) {
      console.error(`Error during download ${action}:`, error);
      this.showError(error.message);
    }
  }

  async monitorProgress() {
    const progressRing = document.querySelector('.progress-ring');
    const progressPercent = document.querySelector('.progress-percent');
    const progressText = document.querySelector('.progress-text');
    const speedElement = document.querySelector('.speed');
    const etaElement = document.querySelector('.eta');

    // Calculate the circumference of the progress ring for stroke-dash calculations
    const radius = progressRing.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress/${this.currentDownloadId}`);
        if (!response.ok) {
          clearInterval(interval);
          this.showError('Failed to fetch progress');
          return;
        }
        const progress = await response.json();

        switch (progress.status) {
          case 'completed':
            clearInterval(interval);
            if (progress.filename) {
              this.addToHistory(progress.filename);
              this.showDownloadLink(progress.filename);
            } else {
              this.showDownloadCompleted();
            }
            document.getElementById('activeDownload')?.remove();
            break;

          case 'error':
          case 'cancelled':
            clearInterval(interval);
            this.showError(progress.message || 'Download cancelled');
            document.getElementById('activeDownload')?.remove();
            break;

          case 'paused':
            progressText.textContent = 'Download Paused';
            break;

          case 'downloading':
            const percent = progress.percent || 0;
            const offset = circumference - (percent / 100) * circumference;
            progressRing.style.strokeDashoffset = offset;
            progressPercent.textContent = `${Math.round(percent)}%`;
            progressText.textContent = `Downloading ${this.getDownloadType()}...`;
            speedElement.textContent = progress.speed || 'Calculating...';
            etaElement.textContent = progress.eta || '--:--';
            break;

          default:
            break;
        }
      } catch (error) {
        clearInterval(interval);
        console.error("Error monitoring progress:", error);
        this.showError('Failed to track progress');
      }
    }, 1000);
  }

  getDownloadType() {
    const url = document.getElementById('urlInput').value;
    return url.includes('list=') ? 'playlist' : 'video';
  }

  showDownloadCompleted() {
    const downloadProgress = document.getElementById('downloadProgress');
    downloadProgress.innerHTML = `
      <div class="download-complete">
        <div class="success-animation">
          <svg class="checkmark" viewBox="0 0 52 52">
            <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
            <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h3>Download Completed!</h3>
        <p>Your download has finished successfully.</p>
        <p>Please check your downloads folder for the file.</p>
      </div>
    `;
  }

  showDownloadLink(filename) {
    const downloadProgress = document.getElementById('downloadProgress');
    downloadProgress.innerHTML = `
      <div class="download-complete">
        <div class="success-animation">
          <svg class="checkmark" viewBox="0 0 52 52">
            <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
            <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h3>Download Completed!</h3>
        ${
          filename
            ? `<button onclick="downloader.initiateDownload('${encodeURIComponent(filename)}')" class="download-button">
                 <i class="fas fa-download"></i> Download Now
               </button>
               <p class="download-filename">${filename}</p>`
            : `<p>Your download has finished successfully.</p>
               <p>Please check your downloads folder for the file.</p>`
        }
      </div>
    `;
  }

  initiateDownload(filename) {
    // Create a temporary anchor element to trigger the download
    const downloadUrl = `/download/${encodeURIComponent(filename)}`;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    console.info(`Initiated download for file: ${filename}`);
  }

  // ---------------------------
  // Download History Handling
  // ---------------------------

  addToHistory(filename) {
    const historyItem = {
      date: new Date().toLocaleString(),
      filename: filename,
      url: document.getElementById('urlInput').value
    };

    this.downloadHistory.unshift(historyItem);
    if (this.downloadHistory.length > 10) this.downloadHistory.pop();
    localStorage.setItem('downloadHistory', JSON.stringify(this.downloadHistory));
    this.updateHistoryPanel();
    console.info("Download added to history:", historyItem);
  }

  toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    panel.classList.toggle('visible');
    this.updateHistoryPanel();
  }

  updateHistoryPanel() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML =
      this.downloadHistory
        .map(
          (item, index) => `
        <div class="download-item">
          <div class="history-header">
            <span class="history-index">#${index + 1}</span>
            <span class="history-date">${item.date}</span>
          </div>
          <div class="history-filename">${item.filename}</div>
          <div class="history-url">${item.url}</div>
        </div>
      `
        )
        .join('') || '<div class="empty-history">No download history available</div>';
  }

  handleHistoryClick(event) {
    const item = event.target.closest('.download-item');
    const url = item.querySelector('.history-url').textContent;
    document.getElementById('urlInput').value = url;
    this.getVideoInfo();
    this.toggleHistoryPanel();
    console.info(`History item clicked. URL set to: ${url}`);
  }

  // ---------------------------
  // Helper Methods
  // ---------------------------

  createLoadingSpinner(text) {
    return `
      <div class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">${text}</div>
      </div>
    `;
  }

  formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds]
      .map((v) => v.toString().padStart(2, '0'))
      .join(':')
      .replace(/^00:/, '');
  }

  formatFileSize(bytes) {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0)} ${sizes[i]}`;
  }

  showError(message) {
    const videoInfo = document.getElementById('videoInfo');
    videoInfo.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-triangle"></i>
        <div class="error-content">
          <h3>Something went wrong!</h3>
          <p>${message}</p>
        </div>
      </div>
    `;
    console.error("Error shown to user:", message);
  }
}

// Initialize the downloader when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.downloader = new YouTubeDownloader();
});
