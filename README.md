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

A modern, feature-rich web application for downloading YouTube videos in various qualities and formats. Built with React, Node.js, and yt-dlp for reliable and fast downloads.

> ⚠️ **LEGAL DISCLAIMER**: This tool is provided for **educational purposes only**. Downloading copyrighted content without permission violates YouTube's Terms of Service and may be illegal in your jurisdiction. Use this tool only for content you own or have explicit permission to download.

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

## ✨ Features

### Core Features
- **Video Information Fetching**: Get video metadata, thumbnail, duration, and available formats
- **Multiple Quality Options**: Download videos in 2160p, 1440p, 1080p, 720p, 480p, 360p, 240p
- **Audio-Only Downloads**: Extract audio in MP3 format
- **Real-Time Progress**: Track download progress with visual indicators
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, intuitive interface built with Material-UI

### Technical Features
- **RESTful API**: Well-structured backend API with proper error handling
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **Input Validation**: Comprehensive validation for security
- **Logging**: Structured logging with Winston
- **Security**: Helmet.js for security headers, CORS configuration
- **TypeScript**: Full TypeScript support for type safety

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

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **FFmpeg** (optional, for audio conversion): [Download](https://ffmpeg.org/)
- **Docker** (optional, for containerization): [Download](https://www.docker.com/)
- **Git**: For version control

### Check Your Installations

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
ffmpeg -version # Optional but recommended
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/youtube-downloader.git
cd youtube-downloader
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

### 4. Configure Environment Variables

#### Backend Configuration

```bash
cd ../server
cp .env.example .env
```

Edit `.env` file with your configuration:

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

## 🏃 Running the Application

### Development Mode

#### Option 1: Run Backend and Frontend Separately

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

#### Option 2: Using Docker Compose (with databases)

```bash
# Start PostgreSQL and Redis only
docker-compose up -d postgres redis

# Then run backend and frontend manually as above
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

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

## 🚀 Deployment

### Backend Deployment

#### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. **Prepare the server:**
```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg (optional)
sudo apt-get install -y ffmpeg

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Deploy the application:**
```bash
# Clone repository
git clone <your-repo-url>
cd youtube-downloader/server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/app.js --name youtube-downloader-api
pm2 save
pm2 startup
```

3. **Set up Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: Platform as a Service (Render, Railway, Heroku)

1. **Create `Procfile` in server directory:**
```
web: node dist/app.js
```

2. **Add build script to `package.json`:**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js"
  }
}
```

3. **Deploy via platform CLI or Git integration**

### Frontend Deployment

#### Option 1: Vercel (Recommended)

```bash
cd client

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### Option 2: Netlify

```bash
cd client

# Build
npm run build

# Deploy dist folder via Netlify CLI or drag-and-drop
```

#### Option 3: CloudFlare Pages

1. Connect your GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`

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

## 🐛 Troubleshooting

### Common Issues

#### 1. "Failed to fetch video information"

**Possible causes:**
- Invalid YouTube URL
- YouTube blocking the request
- Video is private or restricted
- ytdl-core library needs updating

**Solutions:**
```bash
cd server
npm update @distube/ytdl-core
```

#### 2. "CORS Error" in Browser

**Solution:** Check `CORS_ORIGIN` in `.env` matches your frontend URL

#### 3. FFmpeg Not Found

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
# Add to PATH
```

#### 4. Port Already in Use

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process or change PORT in .env
```

#### 5. Downloads Fail for Large Videos

**Solution:** Increase timeout in `client/src/services/api.ts`:
```typescript
timeout: 600000, // 10 minutes
```

---

## 📝 Best Practices

### Security
- Never commit `.env` files to version control
- Use environment variables for sensitive data
- Implement rate limiting to prevent abuse
- Validate all user inputs
- Keep dependencies updated

### Performance
- Implement caching for video metadata
- Use streaming for large file downloads
- Optimize API response times
- Compress static assets
- Use CDN for static file delivery

### Code Quality
- Write meaningful commit messages
- Follow TypeScript best practices
- Write tests for critical functionality
- Use ESLint and Prettier
- Document complex logic

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/youtube-downloader/issues)
3. Create a new issue with detailed information

---

## ⚠️ Final Legal Notice

**This tool is provided for educational and personal use only.** 

YouTube's Terms of Service prohibit downloading videos without explicit permission. This tool should only be used to download:
- Your own content
- Content with explicit Creative Commons licenses
- Content where you have written permission from the copyright holder

**The developers of this tool are not responsible for any misuse or legal consequences arising from the use of this application.**

---

**Happy Coding! 🚀**
