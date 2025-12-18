import { Box, Typography } from '@mui/material';
import { Person } from '@mui/icons-material';
import { VideoInfo } from '../services/api';

interface VideoPreviewProps {
  videoInfo: VideoInfo;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ videoInfo }) => {
  const formatDuration = (seconds: string) => {
    const totalSeconds = parseInt(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box>
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3}>
        {/* Thumbnail */}
        <Box
          sx={{
            width: { xs: '100%', sm: 280 },
            flexShrink: 0,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={videoInfo.thumbnail}
            alt={videoInfo.title}
            sx={{
              width: '100%',
              height: '100%',
              maxHeight: { xs: 200, sm: 180 },
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {formatDuration(videoInfo.lengthSeconds)}
          </Box>
        </Box>

        {/* Info */}
        <Box flex={1} display="flex" flexDirection="column" justifyContent="center">
          <Typography variant="h5" component="h2" gutterBottom sx={{
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {videoInfo.title}
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={0.5}>
              <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {videoInfo.author}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VideoPreview;
