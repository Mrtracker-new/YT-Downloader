import { useState, useRef } from 'react';
import { Box, TextField, IconButton, CircularProgress, InputAdornment, Fade } from '@mui/material';
import { Search, ArrowForward, Close } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { getVideoInfo, VideoInfo } from '../services/api';
import { validateYouTubeUrl, normalizeYouTubeUrl } from '../utils/urlValidator';
import LoadingProgress, { LoadingStage } from './LoadingProgress';

interface VideoInputProps {
  onVideoInfo: (info: VideoInfo) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const VideoInput: React.FC<VideoInputProps> = ({ onVideoInfo, onLoadingChange }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('validating');
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentUrlRef = useRef<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) return;

    // Client-side validation
    const validation = validateYouTubeUrl(url);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid YouTube URL');
      return;
    }

    if (validation.error && validation.error.includes('Playlist')) {
      toast(validation.error, { icon: '⚠️', duration: 4000 });
    }

    const normalizedUrl = normalizeYouTubeUrl(url);

    if (loading && currentUrlRef.current === normalizedUrl) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    currentUrlRef.current = normalizedUrl;
    setLoading(true);
    onLoadingChange?.(true);
    setLoadingStage('validating');

    abortControllerRef.current = new AbortController();

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoadingStage('fetching');

      const info = await getVideoInfo(normalizedUrl);

      setLoadingStage('parsing');
      await new Promise(resolve => setTimeout(resolve, 200));

      setLoadingStage('complete');
      onVideoInfo(info);
      toast.success('Video loaded!');
      setUrl(''); // Clear input on success for a clean state? Or keep it? Let's keep it clear to reduce clutter.
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      toast.error((error as Error).message || 'Failed to fetch video');
      console.error('Error:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
      currentUrlRef.current = '';
      abortControllerRef.current = null;
    }
  };

  const clearInput = () => {
    setUrl('');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          mx: 'auto',
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {loading ? (
                  <CircularProgress size={20} color="inherit" thickness={5} />
                ) : url ? (
                  <Fade in={!!url}>
                    <Box display="flex" alignItems="center" gap={1} mr={0.5}>
                      <IconButton
                        size="small"
                        onClick={clearInput}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                      <IconButton
                        type="submit"
                        sx={{
                          bgcolor: 'primary.main',
                          color: '#fff',
                          width: 36,
                          height: 36,
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        <ArrowForward fontSize="small" />
                      </IconButton>
                    </Box>
                  </Fade>
                ) : null}
              </InputAdornment>
            ),
            sx: {
              bgcolor: '#18181b', // Zinc-900
              borderRadius: '50px', // Pill shape
              pl: 3,
              pr: 1,
              py: 1,
              '& fieldset': {
                borderColor: '#27272a',
                borderWidth: '1px !important',
                borderRadius: '50px',
              },
              '&:hover fieldset': {
                borderColor: '#3f3f46 !important',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#3B82F6 !important', // Blue focus
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
              },
              '& input': {
                color: '#fff',
                fontSize: '1.1rem',
                py: 1.5,
                // Fix for the blue background issue
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 100px #18181b inset !important',
                  WebkitTextFillColor: '#ffffff !important',
                  borderRadius: '0', // Let interactions handle radius
                },
                '&:-webkit-autofill:hover': {
                  WebkitBoxShadow: '0 0 0 100px #18181b inset !important',
                },
                '&:-webkit-autofill:focus': {
                  WebkitBoxShadow: '0 0 0 100px #18181b inset !important',
                },
              }
            }
          }}
        />
      </Box>

      {loading && <LoadingProgress stage={loadingStage} url={url} />}
    </Box>
  );
};

export default VideoInput;
