import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Switch,
    Paper,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Alert,
    Collapse,
} from '@mui/material';
import {
    Settings as SettingsIcon,
    Notifications as NotificationsIcon,
    VolumeUp as SoundIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import {
    getNotificationSettings,
    saveNotificationSettings,
    requestNotificationPermission,
    areNotificationsSupported,
    getNotificationPermissionStatus,
    NotificationSettings as NotificationSettingsType,
} from '../utils/notifications';

const NotificationSettings = () => {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<NotificationSettingsType>(getNotificationSettings());
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        getNotificationPermissionStatus()
    );
    const [showPermissionAlert, setShowPermissionAlert] = useState(false);

    useEffect(() => {
        setPermissionStatus(getNotificationPermissionStatus());
    }, [open]);

    const handleToggle = (key: keyof NotificationSettingsType) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        saveNotificationSettings(newSettings);

        // If enabling desktop notifications, request permission
        if (key === 'desktop' && newSettings.desktop && permissionStatus !== 'granted') {
            handleRequestPermission();
        }
    };

    const handleRequestPermission = async () => {
        const permission = await requestNotificationPermission();
        setPermissionStatus(permission);

        if (permission === 'denied') {
            setShowPermissionAlert(true);
        } else if (permission === 'granted') {
            setShowPermissionAlert(false);
        }
    };



    const notSupported = !areNotificationsSupported();

    return (
        <>
            {/* Settings Icon Button */}
            <IconButton
                onClick={() => setOpen(true)}
                sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary' },
                }}
                aria-label="Notification settings"
            >
                <SettingsIcon />
            </IconButton>

            {/* Settings Drawer */}
            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: { xs: '100%', sm: 400 },
                        bgcolor: 'background.default',
                        borderLeft: '1px solid #27272a',
                    },
                }}
            >
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: '1px solid #27272a',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <SettingsIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="h6" fontWeight={700}>
                                Notification Settings
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setOpen(false)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        {notSupported && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Your browser doesn't support desktop notifications
                            </Alert>
                        )}

                        <Collapse in={showPermissionAlert}>
                            <Alert
                                severity="error"
                                onClose={() => setShowPermissionAlert(false)}
                                sx={{ mb: 2 }}
                            >
                                Notification permission denied. Please enable it in your browser settings.
                            </Alert>
                        </Collapse>

                        <Paper sx={{ p: 2, mb: 2, bgcolor: '#18181b' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Get notified when your downloads complete. You can customize which types of
                                notifications you receive.
                            </Typography>
                        </Paper>

                        <List>
                            {/* Master Toggle */}
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <NotificationsIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                            <Typography fontWeight={600}>Enable Notifications</Typography>
                                        </Box>
                                    }
                                    secondary="Master switch for all notifications"
                                />
                                <ListItemSecondaryAction>
                                    <Switch
                                        edge="end"
                                        checked={settings.enabled}
                                        onChange={() => handleToggle('enabled')}
                                        color="primary"
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>

                            <Divider sx={{ my: 1 }} />

                            {/* Desktop Notifications */}
                            <ListItem disabled={!settings.enabled || notSupported}>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <NotificationsIcon sx={{ fontSize: 20 }} />
                                            <Typography>Desktop Notifications</Typography>
                                        </Box>
                                    }
                                    secondary={
                                        permissionStatus === 'granted'
                                            ? 'Permission granted'
                                            : permissionStatus === 'denied'
                                                ? 'Permission denied - check browser settings'
                                                : 'Click to enable'
                                    }
                                    secondaryTypographyProps={{
                                        color:
                                            permissionStatus === 'granted'
                                                ? 'success.main'
                                                : permissionStatus === 'denied'
                                                    ? 'error.main'
                                                    : 'text.secondary',
                                    }}
                                />
                                <ListItemSecondaryAction>
                                    <Switch
                                        edge="end"
                                        checked={settings.desktop && permissionStatus === 'granted'}
                                        onChange={() => handleToggle('desktop')}
                                        disabled={!settings.enabled || notSupported}
                                        color="primary"
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>

                            <Divider sx={{ my: 1 }} />

                            {/* Sound Alerts */}
                            <ListItem disabled={!settings.enabled}>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <SoundIcon sx={{ fontSize: 20 }} />
                                            <Typography>Sound Alerts</Typography>
                                        </Box>
                                    }
                                    secondary="Play a sound when downloads complete"
                                />
                                <ListItemSecondaryAction>
                                    <Switch
                                        edge="end"
                                        checked={settings.sound}
                                        onChange={() => handleToggle('sound')}
                                        disabled={!settings.enabled}
                                        color="primary"
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                        </List>



                        {/* Info Box */}
                        <Paper sx={{ p: 2, mt: 3, bgcolor: '#18181b', border: '1px solid #27272a' }}>
                            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                <strong>Tip:</strong> Desktop notifications work even when this tab is in the
                                background!
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                If you don't see desktop notifications, check your browser's notification
                                permissions in settings.
                            </Typography>
                        </Paper>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
};

export default NotificationSettings;
