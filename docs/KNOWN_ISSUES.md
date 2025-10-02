# Known Issues & Solutions

## ✅ RESOLVED: ytdl-core Cannot Download Videos

**Status:** FIXED - Migrated to yt-dlp  
**Date Resolved:** 2025-01-02

### Problem
When trying to download videos, you're getting a 500 error. The backend logs show:
```
WARNING: Could not parse decipher function.
Stream URLs will be missing.
```

### Root Cause
YouTube frequently updates their player code to prevent downloading. The `ytdl-core` library (and its forks) need constant updates to keep up with YouTube's changes. **This is not a bug in our code** - it's an ongoing cat-and-mouse game between YouTube and download tools.

### Why This Happens
- YouTube changes their video player JavaScript code
- This breaks the "decipher" function that ytdl-core uses to extract video URLs
- All ytdl-core based libraries are affected until they release updates

---

## 🔧 Solutions

### Option 1: Wait for Library Update (Easiest)
The maintainers of `@distube/ytdl-core` usually release fixes within days. Check:
- https://github.com/distubejs/ytdl-core/issues
- https://www.npmjs.com/package/@distube/ytdl-core

When a new version is released:
```bash
cd server
npm update @distube/ytdl-core
```

### Option 2: Use yt-dlp (Most Reliable) ⭐ RECOMMENDED

`yt-dlp` is a more actively maintained Python tool that works better with YouTube.

#### Installation:

**Windows:**
1. Download from: https://github.com/yt-dlp/yt-dlp/releases
2. Place `yt-dlp.exe` in `C:\Windows` or add to PATH
3. Verify: `yt-dlp --version`

**Or use Chocolatey:**
```powershell
choco install yt-dlp
```

#### Update Backend to Use yt-dlp:

I can modify the backend to use yt-dlp instead of ytdl-core. This requires:
1. Installing yt-dlp on your system
2. Updating `videoService.ts` to call yt-dlp via child_process
3. Parsing yt-dlp's output

**Benefits:**
- ✅ More reliable
- ✅ Better quality options
- ✅ More formats supported
- ✅ Actively maintained

**Drawbacks:**
- ❌ Requires external dependency
- ❌ Slightly slower (spawns new process)

### Option 3: Use YouTube API + Premium (Legal Alternative)

Use YouTube's official API with a Premium subscription to legally download videos you've purchased or have access to.

---

## 🚀 Implementing yt-dlp Solution

If you want to switch to yt-dlp, I can help you:

1. **Install yt-dlp** (see above)
2. **Update the backend** to use yt-dlp instead of ytdl-core
3. **Test** with various videos

Would you like me to implement this? It's much more reliable!

---

## 📊 Comparison

| Solution | Reliability | Speed | Setup Difficulty |
|----------|-------------|-------|------------------|
| ytdl-core | ⚠️ Low (breaks often) | ⚡ Fast | ✅ Easy |
| yt-dlp | ✅ High | 🐌 Moderate | ⚠️ Moderate |
| YouTube API | ✅ Highest | ⚡ Fast | ❌ Complex + Paid |

---

## 🔍 Current Status

- ✅ Frontend is working correctly
- ✅ Backend API is working correctly
- ✅ Video info fetching works
- ✅ Video downloading works via yt-dlp
- ✅ Real-time progress tracking implemented
- ✅ Quality selection working correctly
- **Solution Implemented:** Migrated to yt-dlp successfully

---

## 🎉 Current Implementation

The application now uses **yt-dlp** exclusively:

### What Works:
✅ Video information fetching  
✅ Multiple quality downloads (144p - 4K)  
✅ Audio-only downloads (MP3)  
✅ Real-time progress tracking with ETA  
✅ Download speed display  
✅ Proper filename handling  
✅ Red/Black dark theme UI  

### Requirements:
- yt-dlp must be installed on the system
- FFmpeg required for audio conversion
- Windows: `winget install yt-dlp` or `choco install yt-dlp`

---

## 🐛 Known Minor Issues

No critical issues at this time. If you encounter any problems:

1. **Check yt-dlp is installed**: Run `yt-dlp --version`
2. **Update yt-dlp**: Run `yt-dlp -U` or `winget upgrade yt-dlp`
3. **Check FFmpeg**: Run `ffmpeg -version`

---

## 💡 Future Enhancements

Potential features to implement:
- [ ] Batch downloads
- [ ] Playlist support
- [ ] Download history
- [ ] Resume partial downloads
- [ ] Custom output directory
- [ ] Subtitle downloads
