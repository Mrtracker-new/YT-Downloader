<div align="center">
  <img src="client/public/YT.png" alt="YouTube Downloader Logo" width="150" height="150" />
  
  # 🎥 YouTube Downloader
  
  ### Full-Stack Web Application for Downloading YouTube Videos
  
  [![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![yt-dlp](https://img.shields.io/badge/yt--dlp-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://github.com/yt-dlp/yt-dlp)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
  
  **Created by [Rolan (RNR)](https://rolan-rnr.netlify.app/)**
  
</div>

---

## 🎉 What's New - v2.0 Performance Update!

**Major performance improvements!** We've turbocharged the entire application:

- ⚡ **50-66% faster** video info fetching (large videos now load in 5-10s instead of 15-30s!)
- 🚀 **Instant cached responses** - Fetching the same video twice is now < 100ms
- 📦 **30-50% faster downloads** with parallel fragment downloads (5 concurrent)
- 💨 **New quick preview endpoint** - Get title, thumbnail, and duration in just 1-3 seconds
- 🔄 **Smart request deduplication** - No more duplicate API calls wasting time
- 🗜️ **Optimized compression** - Better bandwidth usage without sacrificing speed

**Try it yourself!** Paste a large 4K video URL and notice how much faster it loads! 🚀

---

Hey there! 👋 

So I built this YouTube downloader because, let's be honest, sometimes you just need to save a video for offline viewing. This is a full-stack web app built with React on the frontend and Node.js + Express on the backend, powered by the awesome yt-dlp library.

It's pretty straightforward - paste a YouTube URL, pick your quality, and boom! You've got your video. I've added support for multiple qualities, audio-only downloads, and made the UI clean and easy to use with Material-UI.

> ⚠️ **Quick Legal Note**: Look, I gotta say this - this tool is for **educational purposes and personal use only**. Don't download copyrighted stuff without permission. Use it for your own content, Creative Commons videos, or stuff you have permission to download. I'm not responsible if you misuse this. Be cool, respect creators' rights! 🙏

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ What Can It Do?

### The Cool Stuff
- 🎬 **Grab Video Info** - Just paste a URL and see all the details: title, thumbnail, duration, you name it
- 🎥 **Quality Options Galore** - Download in anything from 240p (for those slow connections) up to 4K/8K if available
- 🎵 **Audio-Only Mode** - Sometimes you just want the music, right? Extract MP3 audio with one click
- 📊 **Progress Tracking** - Watch the magic happen with real-time download progress
- 📱 **Responsive Design** - Works great on your phone, tablet, or desktop
- 🎨 **Clean UI** - I used Material-UI to make it look professional (and I think it looks pretty good!)

### Under the Hood (For the Nerds)
- 🔧 **RESTful API** - Clean, well-structured API with proper error handling
- 🚫 **Rate Limiting** - Because we don't want to get banned by YouTube, do we?
- 🔒 **Security First** - Input validation, Helmet.js, CORS - all the good security stuff
- 📝 **Logging** - Winston logger to track what's happening
- 📝 **TypeScript Everything** - Because I like my code with type safety!
- ⚡ **Performance Optimized** - 50-66% faster with smart caching and parallel downloads

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Download Library**: yt-dlp (Python-based, actively maintained)
- **Video Processing**: FFmpeg (required for yt-dlp)
- **Language**: TypeScript
- **Logging**: Winston
- **Security**: Helmet.js, express-rate-limit, CORS

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **HTTP Client**: Axios
- **Notifications**: react-hot-toast
- **Styling**: Emotion (via MUI)

### Infrastructure (Optional)
- **Database**: PostgreSQL (for user data, history)
- **Cache/Queue**: Redis (for caching and job queue)
- **Containerization**: Docker & Docker Compose

---

## 📦 What You'll Need

Before we get started, make sure you've got these installed on your machine:

- **Node.js** (v18 or newer) - [Grab it here](https://nodejs.org/) if you don't have it
- **npm** (v9+) - This comes with Node.js, so you're probably good
- **FFmpeg** (optional but recommended) - For audio stuff. [Get it here](https://ffmpeg.org/)
- **Docker** (optional) - If you want to use PostgreSQL/Redis. [Download](https://www.docker.com/)
- **Git** - For cloning the repo, duh! 😄

### Quick Check

Run these to make sure everything's installed:

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v9.0.0 or higher
ffmpeg -version # Optional, but nice to have!
```

---

## 🚀 Getting It Running

### Step 1: Grab the Code

```bash
git clone https://github.com/Mrtracker-new/YT-Downloader.git
cd YT-Downloader
```

### Step 2: Backend Setup

First, let's get the backend sorted:

```bash
cd server
npm install  # Grab a coffee, this might take a minute ☕
```

### Step 3: Frontend Setup

Now the frontend:

```bash
cd ../client
npm install  # Another coffee break? 😄
```

### Step 4: Configure Your Environment

This is important! We need to set up some environment variables.

**For the Backend:**

```bash
cd ../server
cp .env.example .env  # This creates your config file
```

Now open that `.env` file and tweak these settings if you want:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Storage
STORAGE_PATH=./downloads
TEMP_PATH=./temp
MAX_FILE_SIZE=2147483648
FILE_RETENTION_HOURS=24

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

#### Frontend Configuration (Optional)

```bash
cd ../client
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

---

## 🏃 Let's Fire It Up!

### Easy Way (I Use This)

You'll need two terminal windows open. Yeah, I know, but trust me:

**Terminal 1 - Start the Backend:**
```bash
cd server
npm run dev
```

You should see something like `Server running on port 5000` ✅

**Terminal 2 - Start the Frontend:**
```bash
cd client
npm run dev
```

This will open your browser automatically at `http://localhost:3000` 🎉

### Docker Route (For the Database Lovers)

If you want to use PostgreSQL and Redis:

```bash
# Fire up the databases
docker-compose up -d postgres redis

# Then run backend and frontend like above
```

### Where to Find Everything

- **Your App**: http://localhost:3000 🎯
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health (to make sure backend is alive)

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### 1. Get Video Information
```http
POST /api/video/info
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "VIDEO_ID",
    "title": "Video Title",
    "author": "Channel Name",
    "lengthSeconds": "360",
    "thumbnail": "https://...",
    "description": "Video description",
    "formats": [...]
  }
}
```

#### 2. Download Video
```http
POST /api/video/download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "quality": "720p",
  "audioOnly": false
}
```

**Response:** Binary data (video/audio file)

#### 3. Validate URL
```http
POST /api/video/validate
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true
}
```

#### 4. Get Quality Options
```http
POST /api/video/qualities
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoQualities": ["1080p", "720p", "480p"],
    "audioQualities": ["AUDIO_QUALITY_HIGH", "AUDIO_QUALITY_MEDIUM"]
  }
}
```

---

## 📁 Project Structure

```
youtube-downloader/
├── client/                   # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── VideoInput.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   └── DownloadControls.tsx
│   │   ├── services/        # API services
│   │   │   └── api.ts
│   │   ├── App.tsx          # Main App component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/                   # Backend Express application
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   │   └── videoController.ts
│   │   ├── services/        # Business logic
│   │   │   └── videoService.ts
│   │   ├── middleware/      # Express middleware
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimit.ts
│   │   ├── routes/          # API routes
│   │   │   └── video.ts
│   │   ├── utils/           # Utility functions
│   │   │   ├── logger.ts
│   │   │   └── validators.ts
│   │   └── app.ts           # Express app setup
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── docs/                     # Documentation
│   └── PROJECT_PLAN.md
├── docker-compose.yml        # Docker Compose configuration
├── .gitignore
└── README.md
```

---

## 💻 Development

### Backend Development

```bash
cd server

# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Frontend Development

```bash
cd client

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Code Quality

The project includes:
- **ESLint**: For code linting
- **Prettier**: For code formatting
- **TypeScript**: For type safety
- **Pre-commit hooks**: Using Husky (optional)

---

## 🚀 Want to Deploy This?

Honestly, for most use cases, running it locally is perfect. But if you want to deploy it online, here are your options:

### Backend Deployment

**The Simple Way (Render, Railway, or similar):**

These platforms make it super easy. Just connect your GitHub repo and they handle the rest:

1. Sign up for [Render](https://render.com) or [Railway](https://railway.app)
2. Connect your GitHub repository
3. Point it to the `server` directory
4. Set environment variables from your `.env` file
5. Hit deploy and grab a coffee ☕

They'll automatically run `npm install` and `npm run build` for you!

**The Traditional Way (If You're Into That):**

Got a VPS (DigitalOcean, AWS, etc.)? Here's the quick version:

```bash
# SSH into your server, then:

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (keeps your app running)
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/Mrtracker-new/YT-Downloader.git
cd YT-Downloader/server
npm install
npm run build

# Start it up!
pm2 start dist/app.js --name yt-downloader
pm2 save
pm2 startup
```

You'll probably want to set up Nginx as a reverse proxy, but that's a whole other tutorial 😅

### Frontend Deployment

**Easiest Options:**

1. **Vercel** (My favorite for React apps):
   - Connect your GitHub repo
   - Point to `client` directory
   - Deploy button goes brrrr 🚀

2. **Netlify**:
   - Drag and drop the `client/dist` folder after running `npm run build`
   - Or connect GitHub for automatic deploys

3. **Cloudflare Pages**:
   - Connect GitHub repo
   - Build command: `npm run build`
   - Output directory: `dist`

**Pro Tip**: Remember to update your `VITE_API_URL` environment variable to point to your deployed backend!

---

## 🧪 Testing

### Backend Testing

```bash
cd server

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Frontend Testing

```bash
cd client

# Add testing dependencies first
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Run tests (after setup)
npm test
```

### Manual Testing Checklist

- [ ] Video info fetching works for various YouTube URL formats
- [ ] Quality selection updates correctly
- [ ] Audio-only download works
- [ ] Video download completes successfully
- [ ] Error messages display properly for invalid URLs
- [ ] Rate limiting prevents abuse
- [ ] Responsive design works on mobile/tablet
- [ ] Download progress indicators work

---

## 🐛 When Things Break (They Will)

### "Failed to fetch video information"

This usually means:
- You pasted a weird URL (it happens to the best of us)
- The video is private or age-restricted
- YouTube changed something (classic YouTube 🙄)
- yt-dlp needs an update

**Fix it:**
```bash
cd server
npm update yt-dlp  # or reinstall with npm install
```

### "CORS Error" in the Console

Ah yes, CORS. The bane of every web developer's existence 😫

**Fix:** Make sure `CORS_ORIGIN` in your `server/.env` matches your frontend URL. Usually:
```env
CORS_ORIGIN=http://localhost:3000
```

### "FFmpeg Not Found"

You need FFmpeg for audio stuff. Here's how to get it:

```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS (with Homebrew)
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
# Extract it and add to your PATH (Google "add to PATH windows" if you're stuck)
```

### "Port 5000 Already in Use"

Something else is using port 5000. Kill it or change the port:

```bash
# Find what's using port 5000:
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Or just change PORT in your .env file to 5001 or something
```

### Large Videos Timing Out

**Good news!** We've already optimized this for you:
- ⚡ Timeout increased to 90 seconds (from 60s)
- 🚀 Smart caching makes repeat requests instant
- 📦 Parallel fragment downloads (5 concurrent)
- 🔥 Optimized yt-dlp flags for 50-66% faster fetching

If you still need more time, you can increase the timeout in `client/src/services/api.ts`:
```typescript
timeout: 120000, // 2 minutes for very large videos
```

**Pro tip:** Use the quick preview endpoint first for instant results!

---

## 📝 Best Practices

### Security
- Never commit `.env` files to version control
- Use environment variables for sensitive data
- Implement rate limiting to prevent abuse
- Validate all user inputs
- Keep dependencies updated

### Performance
- ⚡ **Optimized yt-dlp flags** - 50-66% faster video info fetching
- 🚀 **Dual-layer caching** - Instant response for cached requests (< 100ms)
- 🔄 **Request deduplication** - Prevents duplicate API calls
- 📦 **Parallel downloads** - 5 concurrent fragments for 30-50% faster downloads
- 💨 **Quick preview endpoint** - Ultra-fast 1-3 second previews
- 🗜️ **Smart compression** - Gzip compression for JSON responses
- 🔌 **HTTP keep-alive** - Connection reuse for better performance

### Code Quality
- Write meaningful commit messages
- Follow TypeScript best practices
- Write tests for critical functionality
- Use ESLint and Prettier
- Document complex logic

---

## 🤝 Want to Contribute?

Dude, I'd love that! 🚀 Found a bug? Want to add a cool feature? Here's how:

1. Fork this repo (there's a button at the top)
2. Create your own branch: `git checkout -b feature/cool-new-thing`
3. Make your changes and commit: `git commit -m 'Added some cool thing'`
4. Push it: `git push origin feature/cool-new-thing`
5. Open a Pull Request and tell me what you did!

Just please:
- Keep the code clean (I use Prettier, you should too!)
- Test your changes before submitting
- Don't break existing stuff (obviously 😅)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Powerful YouTube video downloader (actively maintained fork)
- [Express.js](https://expressjs.com/) - Fast, minimalist web framework for Node.js
- [React](https://react.dev/) - Modern JavaScript library for building user interfaces
- [Material-UI](https://mui.com/) - Beautiful React UI component library
- [FFmpeg](https://ffmpeg.org/) - Complete, cross-platform solution for video/audio processing
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript

---

## 📞 Need Help?

Stuck on something?

1. Check the [When Things Break](#-when-things-break-they-will) section above
2. Look through existing [GitHub Issues](https://github.com/Mrtracker-new/YT-Downloader/issues)
3. Can't find your problem? [Create a new issue](https://github.com/Mrtracker-new/YT-Downloader/issues/new) and I'll try to help!

---

## ⚠️ One More Time: The Legal Stuff

Okay, seriously now - **this is for educational and personal use ONLY**. 

YouTube's Terms of Service are pretty clear about downloading content. Only use this for:
- ✅ Your own videos
- ✅ Creative Commons content
- ✅ Videos where you have explicit permission

Don't be that person who downloads copyrighted content and gets in trouble. I built this as a learning project and to help people download their own content. **Use it responsibly!**

I'm not responsible for what you do with this tool. You've been warned! 🙃

---

## 👋 That's It!

Thanks for checking out my project! If you like it, give it a ⭐ on GitHub. If you find bugs or have suggestions, open an issue or PR.

Built with ❤️ (and way too much coffee ☕) by [Rolan (RNR)](https://rolan-rnr.netlify.app/)

**Happy downloading! 🎉**
