# 🎥 YouTube Premium Downloader

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.0%2B-lightgrey?logo=flask)](https://flask.palletsprojects.com/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-Stable-brightgreen)](https://github.com/yt-dlp/yt-dlp)

A modern YouTube video and audio downloader web application with dark/light themes, preview functionality, and download management.

![App Screenshot](screenshots/1.png) 

## ✨ Features

- 🌓 Dark/Light theme toggle
- 🎬 Video/Audio preview generation
- 📊 Download progress tracking
- ⏯️ Pause/Resume downloads
- 📥 Download history management
- 🎨 Modern responsive UI
- 📱 Mobile-friendly design
- 🔒 Safe download management
- 🎞️ Thumbnail previews
- 📈 Real-time stats

![Feature Demo](screenshots/2.png)

![Feature Demo](screenshots/3.png)
![Feature Demo](screenshots/4.png)
![Feature Demo](screenshots/5.png)
![Feature Demo](screenshots/6.png)
![Feature Demo](screenshots/7.png)
![Feature Demo](screenshots/8.png)
![Feature Demo](screenshots/9.png)
![Feature Demo](screenshots/10.png)

## 🚀 Installation

### Prerequisites
- Python 3.8+
- FFmpeg (installation instructions below)
- Node.js (for optional frontend build)

## Steps
1. Clone the repository:

       git clone https://github.com/yourusername/youtube-premium-downloader.git
       cd youtube-premium-downloader

## Install Python dependencies:

    pip install -r requirements.txt

## Install FFmpeg:

### For Ubuntu/Debian
    sudo apt install ffmpeg

### For Windows (using chocolatey)
    choco install ffmpeg

### For MacOS
    brew install ffmpeg

### Create required directories:

    mkdir -p previews static/images

### Start the application:

    python app.py

### Visit http://localhost:5000 in your browser to use the application!

## 🛠️ Configuration
Environment variables (optional):

env
Copy
DOWNLOAD_DIR=/path/to/downloads
PREVIEW_DIR=/path/to/previews
CUSTOM_FFMPEG_PATH=/path/to/ffmpeg

## 📚 Usage
Paste a YouTube URL in the input field

Click "Analyze Video"

Choose video/audio quality

Start download

Manage downloads through the history panel

 <!-- Add usage gif/screenshot here -->

## 🧰 Tech Stack
Backend:

Python 3

Flask

yt-dlp

FFmpeg

Frontend:

Modern JavaScript (ES6+)

CSS3 with CSS Variables

Font Awesome icons

Responsive design

## ❓ FAQ
Q: Why am I getting "FFmpeg not found" errors?
A: Ensure FFmpeg is installed and in your system PATH. See installation instructions.

Q: Where are downloaded files saved?
A: Files are saved to your system's Downloads folder by default.

Q: Can I download age-restricted content?
A: The application follows YouTube's terms of service. Some content may not be downloadable.

## 🤝 Contributing
Contributions are welcome! Please follow these steps:

Fork the project

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

## 📄 License
Distributed under the MIT License. See LICENSE for more information.

## 📬 Contact
Rolan Lobo - @RolanLobo4 - rolanthelobo@gmail.com

Project Link: https://github.com/yourusername/youtube-premium-downloader
