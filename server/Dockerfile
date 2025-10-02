# Use official Node.js image as base
FROM node:20-slim

# Install system dependencies including ffmpeg and Python
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
