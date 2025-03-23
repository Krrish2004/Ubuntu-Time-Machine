import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  Book as BookIcon,
  Storage as StorageIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

// Import pages
import DashboardPage from './pages/DashboardPage';
import BackupPage from './pages/BackupPage';
import RestorePage from './pages/RestorePage';
import SettingsPage from './pages/SettingsPage';
import ProfilesPage from './pages/ProfilesPage';

const drawerWidth = 240;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  external?: boolean;
}

const App: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('[App] Application initialized');
    console.log('[App] Setting up core command output listener');
    
    // Set up a listener for core command output to log to console
    const removeOutputListener = window.electronAPI.onCoreCommandOutput((output) => {
      console.log('[Core Output]', output);
    });
    
    const removeErrorListener = window.electronAPI.onCoreCommandError((error) => {
      console.error('[Core Error]', error);
    });
    
    // Clean up listeners when component unmounts
    return () => {
      console.log('[App] Removing core command listeners');
      removeOutputListener();
      removeErrorListener();
    };
  }, []);
  
  useEffect(() => {
    console.log(`[App] Location changed to: ${location.pathname}`);
  }, [location]);

  const handleDrawerToggle = () => {
    console.log(`[App] ${mobileOpen ? 'Closing' : 'Opening'} mobile drawer`);
    setMobileOpen(!mobileOpen);
  };

  const handleNavItemClick = (path: string, external?: boolean) => {
    if (external) {
      console.log(`[App] Opening external URL: ${path}`);
      window.electronAPI.openExternalUrl(path);
    } else {
      console.log(`[App] Navigating to: ${path}`);
      navigate(path);
      if (isMobile) {
        setMobileOpen(false);
      }
    }
  };

  const navItems: NavItem[] = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Backup', icon: <BackupIcon />, path: '/backup' },
    { text: 'Restore', icon: <RestoreIcon />, path: '/restore' },
    { text: 'Profiles', icon: <DescriptionIcon />, path: '/profiles' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Version History', icon: <BookIcon />, path: 'https://github.com/username/ubuntu-time-machine/releases', external: true },
    { text: 'Storage Options', icon: <StorageIcon />, path: 'https://ubuntu.com/tutorials/ubuntu-backup-solutions', external: true },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Ubuntu Time Machine
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavItemClick(item.path, item.external)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(228, 77, 38, 0.12)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(228, 77, 38, 0.18)',
                },
              }}
              selected={!item.external && window.location.hash === `#${item.path}`}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'primary.main',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Ubuntu Time Machine
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="/restore" element={<RestorePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/profiles/new" element={<ProfilesPage />} />
          <Route path="/profiles/:id" element={<ProfilesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default App; 