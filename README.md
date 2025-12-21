<div align="center">
  <img src="client/public/YT.png" alt="YouTube Downloader Logo" width="150" height="150" />
  
  # 🍿 YouTube Downloader
  
  ### *The fast, fancy, and free way to hoard your favorite videos!*
  
  [![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
  
  **Crafted with 💖 and ☕ by [Rolan Lobo](https://rolan-rnr.netlify.app)**
  
</div>

---

## Yo! What is this? 👋

Welcome to the **YouTube Downloader**! You know those times when your internet acts like it’s from the 90s, but you *really* need to watch that cat video in 4K? Yeah, I got you.

This isn't just another downloader; it's a **private cinema builder**. Paste a link, click a button, and boom—video is yours. No ads, no malware, no weird popups asking for your mother's maiden name. Just you and your video files.

> ⚠️ **The Boring Legal Stuff**: Serious note though—use this for **personal stuff** and specific educational purposes only. Don't go stealing people's hard work. Respect the creators! 🙏

## 🚀 Why is this one cooler?

Start your engines, because we are packing:

*   🎥 **4K & 8K Support**: Download pixels you didn't even know existed.
*   🧠 **Smart Merging**: The backend now auto-detects when it needs to glue video and audio together like a pro. Validates files so you don't get empty duds!
*   🛡️ **Crash-Proof**: We used to crash browsers with 8K videos (oops). Now we use **Native Downloads**, so you can download massive files without Chrome throwing a tantrum.
*   🎵 **MP3 Magic**: Just want the tunes? We strip the audio cleaner than a banana.
*   ⚡ **Supersonic Speed**: Optimized buffers and parallel chunks. Zoom zoom.
*   🧹 **Self-Cleaning**: The server cleans up its own mess (temp files) so your hard drive doesn't explode.
*   📱 **QR Code Sharing**: Generate a magical QR code that your phone can scan to download videos directly. No more "send it to yourself" emails! Perfect for moving videos from your PC to phone in 2 seconds flat.
*   💚 **Wake Server Button**: Using Render's free tier? (Smart choice, btw!) The server takes naps after 15 minutes. Just hit the "Wake Server" button to poke it awake. Has a 30-second cooldown so you can't spam it (trust me, we tried).

## 🔄 Cross-Device Magic (QR Code Feature)

Ever download a video on your laptop and then need it on your phone? We feel you.

**Here's the deal:**
1. Download a video on your computer
2. Click the **QR Code** button that appears
3. Scan it with your phone
4. BAM! Video downloads straight to your phone

No cables, no cloud storage, no emailing yourself. Just pure wireless wizardry. ✨

## 🛌 Wake Server Button (Render Users)

If you're using Render's free tier (no judgment, we respect the hustle), the server goes to sleep after 15 minutes of inactivity. It's like a lazy cat.

**How to wake it:**
- Look for the green **"Wake Server"** button in the navbar
- Give it a click
- Wait ~10-30 seconds while the server yawns and stretches
- See the success message ✅
- Download videos like normal!

The button has a 30-second cooldown after each wake to prevent accidental spam (and to give the server time to make its morning coffee ☕).


## 🛠️ The Techy Bit (For the code wizards)

Built with the holy trinity:
*   **Starship Enterprise**: React + TypeScript + Material-UI (Frontend)
*   **Engine Room**: Node.js + Express (Backend)
*   **The Muscle**: yt-dlp + FFmpeg (The heavy lifters)

## 📦 What do you need?

Just a few basics. No PhD required.

*   **Node.js** (v18+) - [Get it](https://nodejs.org/)
*   **FFmpeg** - [Get it](https://ffmpeg.org/) (The magic sauce for audio handling)
*   **Git** - To snag the code.

## 🏃‍♂️ Let's Get Running!

### 1. Steal (Clone) the Code
```bash
git clone https://github.com/Mrtracker-new/YT-Downloader.git
cd YT-Downloader
```

### 2. Feed the Beast (Install Stuff)
Open a terminal and run:
```bash
# Set up the brain (Backend)
cd server
npm install

# Set up the face (Frontend)
cd ../client
npm install
```

### 3. Ignition (Run it)

**Terminal 1 (The Brains):**
```bash
cd server
npm run dev
# It listens on port 5000 mainly. It likes port 5000.
```

**Terminal 2 (The Beauty):**
```bash
cd client
npm run dev
# Opens your gateway to video heaven on localhost:3000
```

**Boom!** Go to `http://localhost:3000` and start hoarding. 🎉

---

## 🐛 Something broke?

**"It says 'Failed to fetch'!"**
*   Is the video private?
*   Is your internet acting up?
*   Did YouTube change their algorithm again? (They do that).
*   Run `npm update` in the server folder and pray.

**"Where's the audio?"**
*   Do you have FFmpeg installed? Type `ffmpeg -version` in your terminal. If it yells at you, go install it.

**"The progress bar stuck!"**
*   Wait for it... it's probably merging the audio and video. Huge files take a sec. We added a "Merging..." status so you know we haven't ghosted you.

---

## 🤝 Wanna Help?

Found a bug? Want to make it make coffee?

1.  **Fork it**
2.  **Hack it** (`git checkout -b feature/coffee-maker`)
3.  **Ship it** (`git commit -m 'Adds caffeine support'`)
4.  **Push it** (`git push origin feature/coffee-maker`)
5.  **PR it**

---

## 📝 License

**MIT License**. Basically, do whatever you want, just don't blame me if your computer becomes sentient.

---

<div align="center">

**Built with a lot of ❤️ and slightly too much caffeine by [Rolan Lobo](https://rolan-rnr.netlify.app)**

*Star this repo if it saved your data plan!* ⭐

**Happy Downloading! 🎬**

</div>
