import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Audiotrack,
  Videocam,
  QrCode2 as QrCodeIcon,
  StopCircle as CancelIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { downloadVideo as downloadVideoApi, cancelDownload as cancelDownloadApi, VideoInfo } from '../services/api';
import { notifyDownloadComplete, notifyDownloadFailed } from '../utils/notifications';
import QRCodeModal from './QRCodeModal';

interface DownloadControlsProps {
  videoInfo: VideoInfo;
}

const formatSpeed = (speed: string): string => {
  if (!speed || speed === '0' || speed === 'Unknown') return '';
  if (speed.includes('MiB/s')) return `${parseFloat(speed).toFixed(2)} MB/s`;
  if (speed.includes('KiB/s')) return `${parseFloat(speed).toFixed(0)} KB/s`;
  if (speed.includes('GiB/s')) return `${parseFloat(speed).toFixed(2)} GB/s`;
  return speed;
};

const DownloadControls: React.FC<DownloadControlsProps> = ({ videoInfo }) => {
  const [audioOnly, setAudioOnly] = useState(false);
  const [quality, setQuality] = useState('720p');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /** Stores the downloadId of the currently active download so we can cancel it. */
  const activeDownloadIdRef = useRef<string | null>(null);
  /** Allows us to signal the downloadVideoApi promise to abort SSE tracking. */
  const cancelRequestedRef = useRef(false);

  const actualAvailableQualities = videoInfo.availableQualities || [];

  const qualityLabelMap: Record<string, string> = {
    '2160p': '4K',
    '1440p': '2K',
    '1080p': '1080p',
    '720p': '720p',
    '480p': '480p',
    '360p': '360p',
    '240p': '240p',
    '144p': '144p',
  };

  const videoQualities = actualAvailableQualities.map(q => ({
    label: qualityLabelMap[q] || q,
    value: q
  }));

  const handleFormatChange = (_event: React.MouseEvent<HTMLElement>, newFormat: string | null) => {
    if (newFormat !== null) {
      setAudioOnly(newFormat === 'audio');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setCancelling(false);
    cancelRequestedRef.current = false;
    activeDownloadIdRef.current = null;
    setProgress(0);
    setDownloadSpeed('');
    setEta('');
    setStatusMessage('Starting...');
    const toastId = toast.loading(audioOnly ? 'Downloading audio...' : 'Downloading video...');

    try {
      const url = `https://www.youtube.com/watch?v=${videoInfo.videoId}`;

      await downloadVideoApi(url, quality, audioOnly, (progressData) => {
        // If a cancel was already requested server-side, reflect it in the UI
        if (progressData.status === 'Cancelled') {
          setStatusMessage('Cancelled');
          return;
        }

        setProgress(progressData.progress);
        setDownloadSpeed(progressData.speed);
        setEta(progressData.eta);

        if (progressData.status && progressData.status !== 'Downloading') {
          setStatusMessage(progressData.status);
        } else if (progressData.progress >= 100 || progressData.done) {
          setStatusMessage('Processing...');
        } else {
          setStatusMessage(`${Math.round(progressData.progress)}%`);
        }
      }, (downloadId) => {
        // Store the downloadId as soon as it is known
        activeDownloadIdRef.current = downloadId;
      });

      if (cancelRequestedRef.current) {
        // Download was cancelled — already handled in handleCancel
        return;
      }

      toast.success('Download completed!', { id: toastId });
      setProgress(100);
      setStatusMessage('Done');

      // Show smart notification
      await notifyDownloadComplete(
        videoInfo.title,
        videoInfo.thumbnail,
        audioOnly
      );
    } catch (error) {
      if (cancelRequestedRef.current) {
        // Swallow the error — it was triggered by our own cancel
        toast.dismiss(toastId);
        return;
      }
      toast.error((error as Error).message || 'Download failed', { id: toastId });
      console.error('Download error:', error);

      // Show failure notification
      await notifyDownloadFailed(
        videoInfo.title,
        (error as Error).message
      );
    } finally {
      setDownloading(false);
      setCancelling(false);
      activeDownloadIdRef.current = null;
      cancelRequestedRef.current = false;
      setTimeout(() => {
        setProgress(0);
        setDownloadSpeed('');
        setEta('');
        setStatusMessage('');
      }, 3000);
    }
  };

  const handleCancel = async () => {
    const downloadId = activeDownloadIdRef.current;
    if (!downloadId || cancelling) return;

    setCancelling(true);
    cancelRequestedRef.current = true;
    setStatusMessage('Cancelling...');

    try {
      await cancelDownloadApi(downloadId);
      toast.success('Download cancelled');
    } catch (error) {
      console.error('Cancel error:', error);
      // Even if the API call fails, we still consider it cancelled from the user's perspective
      toast.error('Could not cancel — download may have already completed');
    }
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
          Format
        </Typography>
        <ToggleButtonGroup
          value={audioOnly ? 'audio' : 'video'}
          exclusive
          onChange={handleFormatChange}
          fullWidth
          sx={{
            bgcolor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '12px',
            p: 0.5,
            '& .MuiToggleButton-root': {
              border: 0,
              borderRadius: '8px',
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 600,
              py: 1,
              '&.Mui-selected': {
                bgcolor: '#27272a',
                color: '#fff',
                '&:hover': {
                  bgcolor: '#3f3f46',
                },
              },
            },
          }}
        >
          <ToggleButton value="video">
            <Videocam sx={{ mr: 1, fontSize: 20 }} /> Video
          </ToggleButton>
          <ToggleButton value="audio">
            <Audiotrack sx={{ mr: 1, fontSize: 20 }} /> Audio Only
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {!audioOnly && videoQualities.length > 0 && (
        <Box mb={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            Quality
          </Typography>
          <Grid container spacing={1}>
            {videoQualities.map((q) => (
              <Grid item xs={4} sm={3} key={q.value}>
                <Button
                  fullWidth
                  variant={quality === q.value ? 'contained' : 'outlined'}
                  onClick={() => setQuality(q.value)}
                  disabled={downloading}
                  sx={{
                    borderRadius: '8px',
                    py: 1,
                    border: quality === q.value ? 'none' : '1px solid #27272a',
                    bgcolor: quality === q.value ? 'primary.main' : 'transparent',
                    color: quality === q.value ? '#fff' : 'text.secondary',
                    '&:hover': {
                      bgcolor: quality === q.value ? 'primary.dark' : '#27272a',
                      border: quality === q.value ? 'none' : '1px solid #3f3f46',
                    }
                  }}
                >
                  {q.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Main Action */}
      <Box display="flex" gap={1.5} alignItems="center">
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={downloading}
          onClick={handleDownload}
          sx={{
            py: 2,
            fontSize: '1rem',
            borderRadius: '12px',
            bgcolor: '#fff',
            color: '#000',
            '&:hover': {
              bgcolor: '#f4f4f5',
            },
            '&.Mui-disabled': {
              bgcolor: '#27272a',
              color: '#52525b',
            }
          }}
        >
          {downloading ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" fontWeight={600}>
                {statusMessage}
              </Typography>
            </Box>
          ) : (
            <>
              <DownloadIcon sx={{ mr: 1 }} />
              Download {audioOnly ? 'Audio' : quality}
            </>
          )}
        </Button>

        {/* Cancel Button — visible only while a download is in progress */}
        <Fade in={downloading}>
          <Tooltip title={cancelling ? 'Cancelling…' : 'Cancel download'}>
            <span> {/* Tooltip needs a non-disabled child wrapper */}
              <IconButton
                id="cancel-download-btn"
                onClick={handleCancel}
                disabled={cancelling}
                aria-label="Cancel download"
                sx={{
                  bgcolor: '#27272a',
                  color: '#ef4444',
                  width: 56,
                  height: 56,
                  borderRadius: '12px',
                  flexShrink: 0,
                  transition: 'background-color 0.2s ease, color 0.2s ease, transform 0.15s ease',
                  '&:hover': {
                    bgcolor: '#3f1010',
                    color: '#f87171',
                    transform: 'scale(1.05)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: '#18181b',
                    color: '#7f1d1d',
                  },
                }}
              >
                <CancelIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Fade>

        {/* QR Code Share Button */}
        <Tooltip title="Share via QR Code">
          <IconButton
            onClick={() => setQrModalOpen(true)}
            disabled={downloading}
            sx={{
              bgcolor: '#27272a',
              color: 'text.primary',
              width: 56,
              height: 56,
              borderRadius: '12px',
              transition: 'background-color 0.2s ease',
              '&:hover': {
                bgcolor: '#3f3f46',
              },
              '&.Mui-disabled': {
                bgcolor: '#18181b',
                color: '#52525b',
              },
            }}
          >
            <QrCodeIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Progress Bar */}
      {downloading && (
        <Fade in={downloading}>
          <Box mt={2}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: '#27272a',
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#fff',
                },
              }}
            />
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography variant="caption" color="text.secondary">
                {downloadSpeed && formatSpeed(downloadSpeed)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {eta && `ETA: ${eta}`}
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={`https://www.youtube.com/watch?v=${videoInfo.videoId}`}
        videoTitle={videoInfo.title}
        quality={quality}
        audioOnly={audioOnly}
      />
    </Box>
  );
};

export default DownloadControls;
