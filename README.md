<div align="center">
  <img src="client/public/YT.png" alt="YouTube Downloader Logo" width="150" height="150" />
  
  # 🎥 YouTube Downloader
  
  ### A simple, fast YouTube video downloader
  
  [![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
  
  **Created by [Rolan (RNR)](https://rolan-rnr.netlify.app/)**
  
</div>

---

## Hey there! 👋

Welcome to my YouTube downloader! I built this because sometimes you just need to save a video for offline viewing. It's pretty straightforward - paste a YouTube URL, pick your quality, and you're done!

> ⚠️ **Important**: This tool is for **personal use and education only**. Please respect copyright laws and only download videos you have permission to use. I'm not responsible for how you use this tool - be cool and respect creators' rights! 🙏

## ✨ Features

- 🎥 **Multiple Quality Options** - Download in 144p to 4K (whatever's available)
- 🎵 **Audio Extraction** - Get MP3 audio files at 320kbps
- ⚡ **Fast & Optimized** - Smart caching and parallel downloads
- 📊 **Progress Tracking** - See your download progress in real-time
- 📱 **Mobile Friendly** - Works on any device
- 🎨 **Clean Interface** - Simple and easy to use

## 🛠️ Built With

- **Frontend**: React + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Download Engine**: yt-dlp + FFmpeg
- **Build Tool**: Vite

## 📦 Prerequisites

You'll need these installed:

- **Node.js** (v18+) - [Download here](https://nodejs.org/)
- **FFmpeg** - [Get it here](https://ffmpeg.org/) (needed for audio extraction)
- **Git** - To clone the repository

Quick check:
```bash
node --version  # Should be v18 or higher
ffmpeg -version # Should show ffmpeg info
```

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/Mrtracker-new/YT-Downloader.git
cd YT-Downloader
```

### 2. Install dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Set up environment (optional)
The app works with default settings, but you can customize:

**Backend** (`server/.env`):
```env
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

**Frontend** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
```

### 4. Run the app
Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

**That's it!** Open http://localhost:3000 in your browser 🎉

---

## 🐛 Troubleshooting

### "Failed to fetch video information"
- Check if the URL is valid
- Video might be private or age-restricted
- Try updating: `cd server && npm update`

### "FFmpeg not found"
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows: Download from https://ffmpeg.org/download.html
```

### "Port already in use"
Change the PORT in `server/.env` to a different number (e.g., 5001)


---

## 🤝 Contributing

Found a bug or want to add a feature? Contributions are welcome!

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📝 License

MIT License - feel free to use this project however you like!

---

## 🙏 Credits

Built with:
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube downloader
- [React](https://react.dev/) - UI framework
- [Material-UI](https://mui.com/) - UI components
- [Express.js](https://expressjs.com/) - Backend framework
- [FFmpeg](https://ffmpeg.org/) - Media processing

---

## ⚠️ Legal Notice

**This tool is for personal and educational use only.**

Only download:
- ✅ Your own videos
- ✅ Creative Commons content  
- ✅ Videos you have permission to download

Respect copyright laws and creators' rights. I'm not responsible for misuse of this tool.

---

<div align="center">

**Built with ❤️ by [Rolan (RNR)](https://rolan-rnr.netlify.app/)**

If you found this useful, give it a ⭐ on GitHub!

**Happy downloading! 🎉**

</div>
