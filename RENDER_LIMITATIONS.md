# Render Deployment Notes

## Known Limitations

### Request Timeout
Render free tier has a **30-second timeout** for HTTP requests. This affects:
- Large video downloads (>50MB typically)
- Videos longer than ~3 minutes at high quality

### Workaround Options

1. **Use lower quality settings** for online deployment
   - 480p or 720p instead of 1080p/max
   - This keeps file sizes manageable

2. **For large files**: Download to server, then use a file hosting service
   - Could integrate with AWS S3, Cloudflare R2, or similar
   - Upload completed downloads to cloud storage
   - Provide download link that doesn't timeout

3. **Upgrade Render plan**: Paid plans have longer timeouts

### Current Implementation
- Added `Content-Length` header for proper download tracking
- Enabled `Accept-Ranges` for resume capability
- Files stream correctly on localhost
- Online deployment may truncate large files due to Render timeout

### Recommended User Action
For videos >3 minutes or >50MB:
- Use localhost for downloads
- Or select lower quality (480p/720p)
- Or upgrade to Render paid plan
