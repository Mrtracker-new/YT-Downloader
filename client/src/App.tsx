import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography, Paper } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import VideoInput from './components/VideoInput';
import VideoPreview from './components/VideoPreview';
import DownloadControls from './components/DownloadControls';
import { VideoInfo } from './services/api';

function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#DC2626', // Red-600
        dark: '#B91C1C', // Red-700
        light: '#EF4444', // Red-500
      },
      secondary: {
        main: '#EF4444', // Red-500
        dark: '#DC2626', // Red-600
        light: '#F87171', // Red-400
      },
      background: {
        default: '#0A0A0A', // Nearly black
        paper: '#1A1A1A', // Dark gray
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#A0A0A0',
      },
      error: {
        main: '#DC2626',
      },
      success: {
        main: '#10B981',
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: '12px',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
          },
          contained: {
            boxShadow: '0 4px 14px 0 rgba(220, 38, 38, 0.4)',
            '&:hover': {
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.6)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(220, 38, 38, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(220, 38, 38, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#DC2626',
              },
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster 
        position="top-right"
        toastOptions={{
          success: {
            className: 'toast-success',
            iconTheme: {
              primary: '#10B981',
              secondary: '#1A1A1A',
            },
          },
          error: {
            className: 'toast-error',
            iconTheme: {
              primary: '#EF4444',
              secondary: '#1A1A1A',
            },
          },
          loading: {
            className: 'toast-loading',
            iconTheme: {
              primary: '#DC2626',
              secondary: '#1A1A1A',
            },
          },
        }}
      />
      
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A0A0A 50%, #0A0A0A 100%)',
      }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box textAlign="center" mb={4}>
            <Typography 
              variant="h3" 
              component="h1" 
              gutterBottom 
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
              }}
            >
              🎥 YouTube Downloader
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
              Download YouTube videos in various qualities and formats
            </Typography>
          </Box>

          <Paper elevation={3} sx={{ 
            p: 4, 
            borderRadius: 3,
            background: 'linear-gradient(135deg, #1A1A1A 0%, #0F0F0F 100%)',
            boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
          }}>
          <VideoInput 
            onVideoInfo={setVideoInfo}
          />

          {videoInfo && (
            <>
              <Box mt={4}>
                <VideoPreview videoInfo={videoInfo} />
              </Box>
              
              <Box mt={4}>
                <DownloadControls videoInfo={videoInfo} />
              </Box>
            </>
          )}
        </Paper>

          <Box mt={4} textAlign="center">
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(220, 38, 38, 0.6)',
                fontWeight: 500,
              }}
            >
              ⚠️ This tool is for educational purposes only. Please respect copyright laws.
            </Typography>
          </Box>

          {/* Author Credits */}
          <Box 
            mt={4} 
            pt={3} 
            borderTop="1px solid rgba(220, 38, 38, 0.2)"
            textAlign="center"
          >
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1,
              }}
            >
              Created by{' '}
              <Box
                component="a"
                href="https://rolan-rnr.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#EF4444',
                  fontWeight: 600,
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: '#DC2626',
                    textShadow: '0 0 8px rgba(220, 38, 38, 0.5)',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    width: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, #DC2626, #EF4444)',
                    transition: 'width 0.3s ease',
                  },
                  '&:hover::after': {
                    width: '100%',
                  },
                }}
              >
                Rolan (RNR)
              </Box>
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(220, 38, 38, 0.7)',
                display: 'block',
                mb: 0.5,
              }}
            >
              Built with React + Node.js + yt-dlp
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(220, 38, 38, 0.5)',
                display: 'block',
              }}
            >
              © {new Date().getFullYear()} All rights reserved
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
