# 🚀 Quick Start Guide

**Created by [Rolan (RNR)](https://rolan-rnr.netlify.app/)**

## ✅ Setup Complete!

Your YouTube Downloader application is ready to run! All dependencies are installed.

### 📦 Prerequisites

Before starting, make sure you have installed:

1. **yt-dlp** (Required for downloading)
   ```powershell
   # Using winget (recommended)
   winget install yt-dlp
   
   # Or using Chocolatey
   choco install yt-dlp
   
   # Verify installation
   yt-dlp --version
   ```

2. **FFmpeg** (Required for audio conversion)
   ```powershell
   # Using winget
   winget install Gyan.FFmpeg
   
   # Or using Chocolatey
   choco install ffmpeg
   
   # Verify installation
   ffmpeg -version
   ```

---

## 🎯 How to Start the Application

### **Option 1: Using the Startup Script (Recommended)**

1. **Double-click** `start.ps1` in the Youtube_downloader folder
2. Two PowerShell windows will open (Backend & Frontend)
3. Wait for both to show "ready" messages
4. Open your browser to **http://localhost:3000**

### **Option 2: Manual Start (Two Terminals)**

#### Terminal 1 - Backend:
```powershell
cd C:\Users\rolan\Desktop\Youtube_downloader\server
npm run dev
```
Wait until you see: `🚀 Server running on port 5000`

#### Terminal 2 - Frontend:
```powershell
cd C:\Users\rolan\Desktop\Youtube_downloader\client
npm run dev
```
Wait until you see: `Local: http://localhost:3000`

---

## 🌐 Access Points

Once both servers are running:

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 📝 How to Use

1. Open **http://localhost:3000** in your browser
2. Paste a YouTube URL in the input field
3. Click **"Fetch Info"** to load video information
4. Choose **Video** or **Audio Only** format
5. Select your desired quality
6. Click **"Download"** button
7. The file will download to your browser's download folder

---

## 🛠️ Troubleshooting

### Backend won't start?
- Make sure port 5000 is not in use
- Check the backend terminal for errors
- Try running: `cd server; npm install` again

### Frontend won't start?
- Make sure port 3000 is not in use
- Check the frontend terminal for errors
- Try running: `cd client; npm install` again

### "Failed to fetch video information"?
- Check that the YouTube URL is valid
- Make sure the backend server is running
- Try updating ytdl-core: `cd server; npm update @distube/ytdl-core`

### Port already in use?
Find and kill the process:
```powershell
# Find process on port 5000 (backend)
netstat -ano | findstr :5000

# Find process on port 3000 (frontend)
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <process_id> /F
```

---

## 🎨 Features

### Core Features:
✅ **Multiple video quality options** - Download in 144p to 4K resolution  
✅ **Audio-only download** - Extract audio in MP3 format  
✅ **Real-time progress tracking** - See download progress, speed, and ETA  
✅ **Real-time video preview** - Thumbnail, title, author, duration  
✅ **Smart quality selection** - Actually respects your quality choice  

### UI/UX Features:
✅ **Red & Black Dark Theme** - Modern, gaming-inspired aesthetic  
✅ **Progress bar** - Visual feedback with percentage, speed (MB/s), and ETA  
✅ **Responsive design** - Works on mobile, tablet, and desktop  
✅ **Smooth animations** - Hover effects and transitions  
✅ **Proper file naming** - Downloads save with actual video title  

### Technical Features:
✅ **yt-dlp powered** - Reliable downloads using actively maintained tool  
✅ **TypeScript** - Full type safety throughout the application  
✅ **Rate limiting** - Prevents abuse with configurable limits  
✅ **Input validation** - Secure URL validation  
✅ **Server-Sent Events** - Real-time progress updates  
✅ **No more player-script.js files** - Clean, efficient implementation

---

## ⚠️ Important Legal Notice

This tool is for **educational purposes only**. Only download:
- Your own content
- Content with Creative Commons licenses
- Content you have permission to download

Respect YouTube's Terms of Service and copyright laws.

---

## 🔧 Development Commands

### Backend
```powershell
cd server
npm run dev      # Start development server
npm run build    # Build TypeScript
npm start        # Run production build
npm test         # Run tests
npm run lint     # Lint code
```

### Frontend
```powershell
cd client
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Lint code
```

---

## 📚 Documentation

For detailed documentation, see:
- **README.md** - Complete setup and deployment guide
- **docs/PROJECT_PLAN.md** - Comprehensive project plan and architecture

---

## 💡 Next Steps

Want to add more features?
- Batch downloads
- Playlist support
- Download history
- Dark mode toggle
- User accounts
- Cloud storage integration

See **docs/PROJECT_PLAN.md** for implementation guides!

---

**Happy Downloading! 🎥✨**
