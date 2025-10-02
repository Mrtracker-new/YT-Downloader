import { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Typography,
  LinearProgress,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { downloadVideo as downloadVideoApi, VideoInfo } from '../services/api';

interface DownloadControlsProps {
  videoInfo: VideoInfo;
}

// Helper function to format download speed
const formatSpeed = (speed: string): string => {
  if (!speed || speed === '0' || speed === 'Unknown') return '';
  
  // yt-dlp returns speeds like "2.5MiB/s" or "500KiB/s"
  // Convert MiB to MB and KiB to KB for better readability
  if (speed.includes('MiB/s')) {
    const value = parseFloat(speed);
    return `${value.toFixed(2)} MB/s`;
  } else if (speed.includes('KiB/s')) {
    const value = parseFloat(speed);
    return `${value.toFixed(0)} KB/s`;
  } else if (speed.includes('GiB/s')) {
    const value = parseFloat(speed);
    return `${value.toFixed(2)} GB/s`;
  }
  
  return speed; // Return as-is if format is unknown
};

const DownloadControls: React.FC<DownloadControlsProps> = ({ videoInfo }) => {
  const [audioOnly, setAudioOnly] = useState(false);
  const [quality, setQuality] = useState('720p');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Extract available qualities
  const videoQualities = [
    ...new Set(
      videoInfo.formats
        .filter((f) => f.hasVideo && f.qualityLabel)
        .map((f) => f.qualityLabel)
    ),
  ].filter(Boolean) as string[];

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setDownloadSpeed('');
    setEta('');
    setStatusMessage('Starting download...');
    const toastId = toast.loading(audioOnly ? 'Downloading audio...' : 'Downloading video...');

    try {
      // Construct URL from videoId
      const url = `https://www.youtube.com/watch?v=${videoInfo.videoId}`;
      
      // Start download with progress tracking
      await downloadVideoApi(url, quality, audioOnly, (progressData) => {
        setProgress(progressData.progress);
        setDownloadSpeed(progressData.speed);
        setEta(progressData.eta);
        
        // Update status message based on progress
        if (progressData.progress >= 100 || progressData.done) {
          setStatusMessage('Preparing your file...');
        } else {
          setStatusMessage('Downloading...');
        }
      });
      
      toast.success('Download completed!', { id: toastId });
      setProgress(100);
      setStatusMessage('');
    } catch (error) {
      toast.error((error as Error).message || 'Download failed', { id: toastId });
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
      setTimeout(() => {
        setProgress(0);
        setDownloadSpeed('');
        setEta('');
        setStatusMessage('');
      }, 2000);
    }
  };

  return (
    <Box>
      <FormControl component="fieldset" fullWidth>
        <FormLabel 
          component="legend"
          sx={{ 
            color: '#EF4444',
            fontWeight: 600,
            '&.Mui-focused': {
              color: '#DC2626',
            },
          }}
        >
          Format
        </FormLabel>
        <RadioGroup
          row
          value={audioOnly ? 'audio' : 'video'}
          onChange={(e) => setAudioOnly(e.target.value === 'audio')}
        >
          <FormControlLabel 
            value="video" 
            control={
              <Radio 
                sx={{
                  color: 'rgba(220, 38, 38, 0.5)',
                  '&.Mui-checked': {
                    color: '#DC2626',
                  },
                }}
              />
            } 
            label="Video" 
          />
          <FormControlLabel 
            value="audio" 
            control={
              <Radio 
                sx={{
                  color: 'rgba(220, 38, 38, 0.5)',
                  '&.Mui-checked': {
                    color: '#DC2626',
                  },
                }}
              />
            } 
            label="Audio Only" 
          />
        </RadioGroup>
      </FormControl>

      {!audioOnly && videoQualities.length > 0 && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <FormLabel
            sx={{ 
              color: '#EF4444',
              fontWeight: 600,
              '&.Mui-focused': {
                color: '#DC2626',
              },
            }}
          >
            Quality
          </FormLabel>
          <Select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            disabled={downloading}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(220, 38, 38, 0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(220, 38, 38, 0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#DC2626',
              },
            }}
          >
            {videoQualities.map((q) => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
        disabled={downloading}
        onClick={handleDownload}
        sx={{ 
          mt: 3,
          py: 1.5,
          fontSize: '1.1rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          boxShadow: '0 4px 14px 0 rgba(220, 38, 38, 0.4)',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)',
            boxShadow: '0 6px 20px rgba(220, 38, 38, 0.6)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            background: 'rgba(220, 38, 38, 0.3)',
          },
        }}
      >
        {downloading ? (statusMessage || 'Downloading...') : `Download ${audioOnly ? 'Audio (MP3)' : `Video (${quality})`}`}
      </Button>

      {/* Progress Bar */}
      {downloading && (
        <Box mt={2}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(220, 38, 38, 0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)',
              },
            }}
          />
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#EF4444',
                fontWeight: 600,
              }}
            >
              {progress.toFixed(1)}%
            </Typography>
            {downloadSpeed && formatSpeed(downloadSpeed) && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(220, 38, 38, 0.8)',
                  fontWeight: 500,
                }}
              >
                {formatSpeed(downloadSpeed)} {eta && eta !== 'Unknown' && `• ETA: ${eta}`}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box mt={2} textAlign="center">
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(220, 38, 38, 0.5)',
            fontWeight: 500,
          }}
        >
          Download may take a few moments depending on video size
        </Typography>
      </Box>
    </Box>
  );
};

export default DownloadControls;
