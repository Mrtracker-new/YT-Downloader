<div align="center">
  <img src="client/public/YT.png" alt="YouTube Downloader Logo" width="150" height="150" />

  # 🍿 YouTube Downloader

  ### *The fast, fancy, and free way to hoard your favorite videos!*

  [![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

  **Crafted with 💖 and ☕ by [Rolan Lobo](https://rolan-rnr.netlify.app)**

  > 🚧 **Currently under active maintenance** — things are being cooked. Stay tuned.

</div>

---

## What is this? 👋

A **self-hosted YouTube downloader** that actually works. Paste a link, pick a format, and boom — video saved. No ads, no sketchy stuff, no popups. Just clean downloads.

> ⚠️ For personal and educational use only. Respect the creators! 🙏

---

## ✨ Features

*   🎥 **4K & 8K Support** — Download pixels you didn't even know existed.
*   🧠 **Smart Merging** — Auto-glues video and audio when needed. No silent videos.
*   🛡️ **Crash-Proof Downloads** — Uses native downloads so your browser doesn't melt on huge files.
*   🎵 **MP3 Mode** — Just the audio? Stripped clean. Pure tunes.
*   ⚡ **Fast** — Optimized buffers. Goes zoom zoom.
*   🧹 **Self-Cleaning** — Temp files are cleaned up automatically. Your disk is safe.
*   🎯 **Download Queue** — Handles multiple requests intelligently. No server meltdowns.
*   📱 **QR Code Sharing** *(when deployed)* — Scan from your phone to grab the video directly. Wireless magic for when it's live.

---

## 🚀 Running It (One Click)

Just double-click **`start-app.bat`** and let it do its thing.

It handles everything automatically:
- ✅ Checks / installs Node.js (v18+) via `winget`
- ✅ Downloads `yt-dlp` and `ffmpeg` into a local `bin/` folder
- ✅ Installs all npm dependencies for server & client
- ✅ Sets up `.env` files with safe defaults
- ✅ Launches both servers and opens your browser

```
📁 YT-Downloader/
  └─ start-app.bat  ← Double-click. That's it.
```

> 💡 If something fails mid-setup, just re-run it. The script skips steps it's already done.

---

## 🛠️ Tech Stack

*   **Frontend** — React + TypeScript + Material-UI
*   **Backend** — Node.js + Express
*   **Tools** — yt-dlp + FFmpeg (the real MVPs)

---

## 📝 License

**MIT** — Do whatever. Just don't blame me if it becomes sentient.

---

<div align="center">

**Built with ❤️ and too much caffeine by [Rolan Lobo](https://rolan-rnr.netlify.app)**

**Happy Downloading! 🎬**

</div>
