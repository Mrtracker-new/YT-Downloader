# Use official Node.js image (full version for better package support)
FROM node:20

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp using pip (from master for latest fixes)
RUN pip3 install --break-system-packages https://github.com/yt-dlp/yt-dlp/archive/master.zip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
