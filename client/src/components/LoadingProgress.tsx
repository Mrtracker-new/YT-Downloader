import { Box, Typography, LinearProgress, Fade } from '@mui/material';
import { useEffect, useState } from 'react';

export type LoadingStage = 'validating' | 'fetching' | 'parsing' | 'complete';

interface LoadingProgressProps {
  stage: LoadingStage;
  url?: string;
}

const stages = {
  validating: { label: 'Validating URL...', progress: 25 },
  fetching: { label: 'Fetching video info...', progress: 60 },
  parsing: { label: 'Processing...', progress: 90 },
  complete: { label: 'Done', progress: 100 },
};

const LoadingProgress: React.FC<LoadingProgressProps> = ({ stage }) => {
  const currentStage = stages[stage];
  const [showLongWait, setShowLongWait] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowLongWait(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Fade in={true}>
      <Box mt={4} width="100%" maxWidth="400px" mx="auto" textAlign="center">
        <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
          {currentStage.label}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={currentStage.progress}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: '#27272a',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#3B82F6', // Blue-500
              borderRadius: 2,
            },
          }}
        />

        {showLongWait && stage !== 'complete' && (
          <Fade in={true}>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}>
              Taking a bit longer than usual...
            </Typography>
          </Fade>
        )}
      </Box>
    </Fade>
  );
};

export default LoadingProgress;
