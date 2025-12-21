import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography, Paper, AppBar, Toolbar, IconButton, Button, CircularProgress, Tooltip } from '@mui/material';
import { Toaster, toast } from 'react-hot-toast';
import { YouTube, GitHub, PowerSettingsNew } from '@mui/icons-material';
import VideoInput from './components/VideoInput';
import VideoPreview from './components/VideoPreview';
import DownloadControls from './components/DownloadControls';
import NotificationSettings from './components/NotificationSettings';
import { VideoInfo, wakeServer } from './services/api';

function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#3B82F6', // Blue-500 (Professional, Trustworthy)
        dark: '#2563EB', // Blue-600
        light: '#60A5FA', // Blue-400
      },
      secondary: {
        main: '#64748B', // Slate-500
        dark: '#475569', // Slate-600
        light: '#94A3B8', // Slate-400
      },
      background: {
        default: '#09090b', // Zinc-950 (Rich dark black)
        paper: '#18181b',   // Zinc-900 (Background card)
      },
      text: {
        primary: '#F4F4F5', // Zinc-100
        secondary: '#A1A1AA', // Zinc-400
      },
      error: {
        main: '#EF4444', // Red-500 (Standard error, not branded)
      },
      success: {
        main: '#10B981', // Emerald-500
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: {
      borderRadius: 12, // Modern soft corners
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid #27272a', // Zinc-800
            boxShadow: 'none', // Flat design
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
          contained: {
            // Subtle elevation on hover only for primary actions
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
          }
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#3f3f46', // Zinc-700
              },
              '&:hover fieldset': {
                borderColor: '#52525b', // Zinc-600
              },
              '&.Mui-focused fieldset': {
                borderColor: '#3B82F6', // Primary Blue
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(9, 9, 11, 0.8)', // Semi-transparent default background
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #27272a',
            backgroundImage: 'none',
            boxShadow: 'none',
          }
        }
      }
    },
  });

  const handleWakeServer = async () => {
    // Prevent spam clicking with cooldown
    if (cooldownSeconds > 0) {
      toast.error(`Please wait ${cooldownSeconds}s before waking server again`, {
        icon: '⏳',
        duration: 2000,
      });
      return;
    }

    setIsWakingServer(true);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const isRenderServer = apiUrl.includes('render.com') || apiUrl.includes('onrender.com');
    const serverName = isRenderServer ? 'Render server' : 'Local server';

    try {
      const result = await wakeServer();
      toast.success(`${serverName} is awake and ready!`, {
        icon: '✅',
        duration: 3000,
      });
      console.log(`${serverName} woken at:`, result.timestamp);
      console.log('API URL:', apiUrl);

      // Start 30-second cooldown to prevent spam
      setCooldownSeconds(30);
      const cooldownInterval = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error(`Failed to wake ${serverName.toLowerCase()}. Please try again.`, {
        icon: '❌',
        duration: 4000,
      });
      console.error('Wake server error:', error);
      console.error('API URL:', apiUrl);
    } finally {
      setIsWakingServer(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster
        position="bottom-center" // Less intrusive
        toastOptions={{
          style: {
            background: '#18181b', // Zinc-900
            color: '#f4f4f5',
            border: '1px solid #27272a',
            padding: '12px 16px',
            borderRadius: '8px',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#18181b' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#18181b' },
          },
        }}
      />

      {/* Minimal Navbar */}
      <AppBar position="fixed">
        <Container maxWidth="md">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <YouTube sx={{ color: '#EF4444', fontSize: 28 }} />
              <Typography variant="h6" color="text.primary" fontWeight={700}>
                YT Downloader
              </Typography>
            </Box>

            <Box display="flex" gap={1} alignItems="center">
              <Tooltip
                title="Wake the server"
                arrow
                placement="bottom"
              >
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleWakeServer}
                    disabled={isWakingServer || cooldownSeconds > 0}
                    startIcon={
                      isWakingServer ? (
                        <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
                      ) : cooldownSeconds > 0 ? (
                        <PowerSettingsNew sx={{ opacity: 0.5 }} />
                      ) : (
                        <PowerSettingsNew />
                      )
                    }
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      color: isWakingServer ? 'text.secondary' : 'success.main',
                      borderColor: isWakingServer ? 'text.secondary' : 'success.main',
                      borderWidth: '1.5px',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: { xs: 1.5, sm: 2 },
                      py: 0.75,
                      minWidth: { xs: 'auto', sm: '120px' },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',

                      // Gradient background on hover
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: 0,
                      },

                      '&:hover': {
                        borderColor: 'success.light',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',

                        '&::before': {
                          opacity: 1,
                        },
                      },

                      '&:active': {
                        transform: 'translateY(0)',
                      },

                      '&:disabled': {
                        borderColor: 'text.disabled',
                        color: 'text.disabled',
                        cursor: 'not-allowed',
                      },

                      // Pulse animation when waking
                      ...(isWakingServer && {
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        '@keyframes pulse': {
                          '0%, 100%': {
                            opacity: 1,
                          },
                          '50%': {
                            opacity: 0.7,
                          },
                        },
                      }),

                      // Hide text on mobile
                      '& .MuiButton-startIcon': {
                        marginRight: { xs: 0, sm: 1 },
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: { xs: 'none', sm: 'inline' },
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {isWakingServer ? 'Waking...' : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Wake Server'}
                    </Box>
                  </Button>
                </span>
              </Tooltip>
              <NotificationSettings />
              <IconButton
                color="inherit"
                component="a"
                href="https://github.com/Mrtracker-new/YT-Downloader"
                target="_blank"
                sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
              >
                <GitHub />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Box sx={{
        minHeight: '100vh',
        pt: '120px', // Header offset
        pb: 8,
      }}>
        <Container maxWidth="md">
          {/* Main Content Area */}
          <Box display="flex" flexDirection="column" gap={4}>

            {/* Hero / Input Section */}
            <Box textAlign="center" mb={2}>
              <Typography variant="h3" component="h1" gutterBottom sx={{
                mb: 1,
                background: 'linear-gradient(to right, #fff, #a1a1aa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Download YouTube Videos
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '480px', mx: 'auto' }}>
                Paste a link below to save videos in HD, 4K, or generic audio formats.
              </Typography>
            </Box>

            {/* Input Card */}
            <Paper sx={{ p: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
              <VideoInput onVideoInfo={setVideoInfo} />
            </Paper>

            {/* Results Section */}
            {videoInfo && (
              <Box sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', md: '1fr' }, // Stacked for now, can be side-by-side
                animation: 'fadeIn 0.5s ease-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateY(10px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' }
                }
              }}>
                <Paper sx={{ p: 3, background: '#18181b' }}>
                  <VideoPreview videoInfo={videoInfo} />
                  <Box mt={4}>
                    <DownloadControls videoInfo={videoInfo} />
                  </Box>
                </Paper>
              </Box>
            )}

          </Box>
        </Container>
      </Box>

      {/* Subtle Footer */}
      <Box component="footer" py={4} textAlign="center" borderTop="1px solid #27272a">
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} YT Downloader • Educational Purpose Only
        </Typography>
      </Box>
    </ThemeProvider>
  );
}

export default App;
