#!/bin/bash
# Install yt-dlp for video downloading

echo "Installing yt-dlp..."
pip install https://github.com/yt-dlp/yt-dlp/archive/master.zip

echo "yt-dlp installed successfully!"
yt-dlp --version
