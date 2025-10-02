import { Box, Typography, Card, CardMedia, CardContent, Chip } from '@mui/material';
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
    <Card 
      elevation={2}
      sx={{
        background: 'linear-gradient(135deg, #1F1F1F 0%, #151515 100%)',
        border: '1px solid rgba(220, 38, 38, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(220, 38, 38, 0.5)',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.2)',
        },
      }}
    >
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }}>
        <CardMedia
          component="img"
          sx={{
            width: { xs: '100%', sm: 200 },
            height: { xs: 200, sm: 150 },
            objectFit: 'cover',
            borderRight: { sm: '1px solid rgba(220, 38, 38, 0.2)' },
          }}
          image={videoInfo.thumbnail}
          alt={videoInfo.title}
        />
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom noWrap sx={{ fontWeight: 600 }}>
            {videoInfo.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
            {videoInfo.author}
          </Typography>
          <Box mt={1}>
            <Chip
              label={`Duration: ${formatDuration(videoInfo.lengthSeconds)}`}
              size="small"
              sx={{
                background: 'rgba(220, 38, 38, 0.15)',
                color: '#EF4444',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                fontWeight: 600,
              }}
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Box>
    </Card>
  );
};

export default VideoPreview;
