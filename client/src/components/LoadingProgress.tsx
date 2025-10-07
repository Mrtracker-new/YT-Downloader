import { Box, Typography, LinearProgress, Paper, Chip } from '@mui/material';
import { useEffect, useState } from 'react';
import { 
  CloudDownload as CloudDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

export type LoadingStage = 'validating' | 'fetching' | 'parsing' | 'complete';

interface LoadingProgressProps {
  stage: LoadingStage;
  url?: string;
}

const stages = {
  validating: {
    label: 'Validating URL',
    icon: RefreshIcon,
    progress: 25,
    tip: 'Checking if the video is accessible...',
  },
  fetching: {
    label: 'Fetching Video Data',
    icon: CloudDownloadIcon,
    progress: 60,
    tip: 'Retrieving video information from YouTube...',
  },
  parsing: {
    label: 'Processing Information',
    icon: CheckCircleIcon,
    progress: 90,
    tip: 'Almost there! Preparing video details...',
  },
  complete: {
    label: 'Complete',
    icon: CheckCircleIcon,
    progress: 100,
    tip: 'Video information loaded successfully!',
  },
};

const tips = [
  '💡 Tip: You can download videos in multiple quality options',
  '🎵 Tip: Enable "Audio Only" to extract just the audio track',
  '⚡ Tip: First-time requests may take longer due to authentication',
  '🔄 Tip: Subsequent requests for the same video are much faster',
  '📱 Tip: Works with regular videos, shorts, and live streams',
  '🎬 Tip: Video quality depends on what YouTube has available',
];

const LoadingProgress: React.FC<LoadingProgressProps> = ({ stage }) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const currentStage = stages[stage];
  const StageIcon = currentStage.icon;

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mt: 3,
        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        borderRadius: 3,
      }}
    >
      <Box display="flex" alignItems="center" mb={2} gap={2}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: '50%',
            background: 'rgba(220, 38, 38, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StageIcon sx={{ color: '#EF4444', fontSize: 28 }} />
        </Box>
        <Box flex={1}>
          <Typography variant="h6" fontWeight={600} color="text.primary">
            {currentStage.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentStage.tip}
          </Typography>
        </Box>
        <Chip 
          label={`${elapsedTime}s`}
          size="small"
          sx={{
            background: 'rgba(220, 38, 38, 0.1)',
            color: '#EF4444',
            fontWeight: 600,
          }}
        />
      </Box>

      <LinearProgress
        variant="determinate"
        value={currentStage.progress}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)',
          },
        }}
      />

      <Box mt={2} p={2} sx={{ 
        background: 'rgba(0, 0, 0, 0.2)', 
        borderRadius: 2,
        border: '1px solid rgba(220, 38, 38, 0.1)',
      }}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {tips[tipIndex]}
        </Typography>
      </Box>

      {elapsedTime > 15 && (
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            Taking longer than usual? This might be due to network conditions or YouTube's response time.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default LoadingProgress;
