import { useState, useRef } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
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

    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    // Client-side validation for instant feedback
    const validation = validateYouTubeUrl(url);
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid YouTube URL');
      return;
    }

    // Show warning for playlists
    if (validation.error && validation.error.includes('Playlist')) {
      toast(validation.error, { icon: '⚠️', duration: 4000 });
    }

    // Normalize URL to canonical form
    const normalizedUrl = normalizeYouTubeUrl(url);

    // Check if this is a duplicate request
    if (loading && currentUrlRef.current === normalizedUrl) {
      toast('Already loading this video...', { icon: '⏳' });
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    currentUrlRef.current = normalizedUrl;
    setLoading(true);
    onLoadingChange?.(true);
    setLoadingStage('validating');
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Stage 1: Validating (instant)
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoadingStage('fetching');
      
      // Stage 2: Fetching (main operation)
      const info = await getVideoInfo(normalizedUrl);
      
      // Stage 3: Parsing (quick)
      setLoadingStage('parsing');
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Complete
      setLoadingStage('complete');
      onVideoInfo(info);
      toast.success('Video information loaded successfully!');
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        return;
      }
      toast.error((error as Error).message || 'Failed to fetch video information');
      console.error('Error fetching video info:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
      currentUrlRef.current = '';
      abortControllerRef.current = null;
    }
  };

  return (
    <>
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }} alignItems="stretch">
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Paste YouTube URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: '#EF4444' }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(220, 38, 38, 0.05)',
              transition: 'all 0.3s ease',
              '& fieldset': {
                borderColor: 'rgba(220, 38, 38, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(220, 38, 38, 0.5)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                '& fieldset': {
                  borderColor: '#DC2626',
                  borderWidth: '2px',
                },
              },
            },
            // Override browser autofill blue background
            '& input:-webkit-autofill': {
              WebkitBoxShadow: '0 0 0 100px #1A1A1A inset !important',
              WebkitTextFillColor: '#FFFFFF !important',
              caretColor: '#FFFFFF',
              borderRadius: '4px',
            },
            '& input:-webkit-autofill:hover': {
              WebkitBoxShadow: '0 0 0 100px #1F1F1F inset !important',
            },
            '& input:-webkit-autofill:focus': {
              WebkitBoxShadow: '0 0 0 100px #1A1A1A inset !important',
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{ 
            minWidth: { xs: '100%', sm: 140 },
            height: { xs: '56px', sm: '56px' }, // Match TextField height
            px: 4,
            fontWeight: 700,
            fontSize: '1rem',
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
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Fetch Info'}
        </Button>
      </Box>
    </Box>
    
    {loading && <LoadingProgress stage={loadingStage} url={url} />}
    </>
  );
};

export default VideoInput;
