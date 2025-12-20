import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Paper,
    Tooltip,
} from '@mui/material';
import {
    Close as CloseIcon,
    Download as DownloadIcon,
    ContentCopy as CopyIcon,
    QrCode2 as QrCodeIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

interface QRCodeModalProps {
    open: boolean;
    onClose: () => void;
    url: string;
    videoTitle: string;
    quality?: string;
    audioOnly?: boolean;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ open, onClose, url, videoTitle, quality = '720p', audioOnly = false }) => {
    const [copied, setCopied] = useState(false);

    // Construct the download API URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const downloadUrl = `${API_BASE_URL}/api/video/stream?url=${encodeURIComponent(url)}&quality=${quality}&audioOnly=${audioOnly}`;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(downloadUrl);
            setCopied(true);
            toast.success('Download link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy URL');
        }
    };

    const handleDownloadQR = () => {
        try {
            // Get the QR code SVG element
            const svg = document.getElementById('qr-code-svg');
            if (!svg) {
                toast.error('QR code not found');
                return;
            }

            // Convert SVG to canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);

                // Download canvas as PNG
                canvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        const fileName = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_QRCode.png`;
                        link.href = url;
                        link.download = fileName;
                        link.click();
                        URL.revokeObjectURL(url);
                        toast.success('QR code downloaded!');
                    }
                });
            };

            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            console.error('Failed to download QR code:', error);
            toast.error('Failed to download QR code');
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.default',
                    border: '1px solid #27272a',
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid #27272a', pb: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <QrCodeIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={700}>
                            Share via QR Code
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ py: 4 }}>
                <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
                    {/* QR Code */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            bgcolor: '#fff',
                            borderRadius: 2,
                            display: 'inline-block',
                        }}
                    >
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={downloadUrl}
                            size={256}
                            level="H"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#000000"
                        />
                    </Paper>

                    {/* Video Title */}
                    <Typography
                        variant="body1"
                        color="text.primary"
                        fontWeight={600}
                        textAlign="center"
                        sx={{ maxWidth: '100%', wordBreak: 'break-word' }}
                    >
                        {videoTitle}
                    </Typography>

                    {/* URL Display with Copy Button */}
                    <Paper
                        sx={{
                            p: 2,
                            bgcolor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: 2,
                            width: '100%',
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {downloadUrl}
                            </Typography>
                            <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                                <IconButton
                                    size="small"
                                    onClick={handleCopyUrl}
                                    sx={{
                                        color: copied ? 'success.main' : 'text.secondary',
                                        '&:hover': { color: copied ? 'success.main' : 'primary.main' },
                                    }}
                                >
                                    <CopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Paper>

                    {/* Instructions */}
                    <Paper sx={{ p: 2, bgcolor: '#18181b', border: '1px solid #27272a', width: '100%' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            <strong>💡 How to use:</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            1. Scan the QR code with your phone camera
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            2. Tap the notification to open the link
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            3. The video will download automatically ({audioOnly ? 'Audio' : quality})
                        </Typography>
                    </Paper>
                </Box>
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #27272a', p: 2, gap: 1 }}>
                <Button
                    variant="outlined"
                    onClick={handleDownloadQR}
                    startIcon={<DownloadIcon />}
                    sx={{
                        borderColor: '#27272a',
                        color: 'text.primary',
                        '&:hover': {
                            borderColor: '#3f3f46',
                            bgcolor: '#18181b',
                        },
                    }}
                >
                    Download QR
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleCopyUrl}
                    startIcon={<CopyIcon />}
                    sx={{
                        borderColor: '#27272a',
                        color: 'text.primary',
                        '&:hover': {
                            borderColor: '#3f3f46',
                            bgcolor: '#18181b',
                        },
                    }}
                >
                    Copy Download Link
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default QRCodeModal;
