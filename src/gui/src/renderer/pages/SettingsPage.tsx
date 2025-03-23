import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Tab,
  Tabs,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  Alert,
  Snackbar,
  Tooltip,
  IconButton,
  SelectChangeEvent,
} from '@mui/material';
import {
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  DeleteForever as DeleteIcon,
  BugReport as BugReportIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    appTheme: 'system',
    startMinimized: false,
    closeToTray: true,
    checkForUpdates: true,
    deleteLogsAfter: 30,
    maxConcurrentBackups: 1,
    tempDirectory: '/tmp',
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    showNotifications: true,
    notifyBackupStart: true,
    notifyBackupComplete: true,
    notifyBackupFailed: true,
    notifyLowSpace: true,
    lowSpaceThreshold: 10, // in GB
  });
  
  // Performance settings
  const [performanceSettings, setPerformanceSettings] = useState({
    compressionLevel: 6,
    maxCpuUsage: 50,
    maxMemoryUsage: 2048, // in MB
    ioNiceness: 'normal',
    networkBandwidthLimit: 0, // 0 = unlimited, otherwise in MB/s
    enableMultithreading: true,
  });
  
  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    debugMode: false,
    customLogPath: '',
    enableExperimentalFeatures: false,
    autoRepairCorruptBackups: true,
    retryFailedBackups: 3,
    verboseLogging: false,
  });
  
  // Debug stats
  const [debugStats, setDebugStats] = useState({
    appVersion: '2.0.0',
    coreBinaryVersion: '2.0.0',
    systemInfo: 'Ubuntu 22.04 LTS x86_64',
    runningBackups: 0,
    pendingBackups: 0,
    dbSize: '15.2 MB',
    logSize: '4.7 MB',
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      // In a real app, this would fetch from the Electron API
      // For now, just simulate a network delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Settings are already initialized with default values above
      setLoading(false);
    };
    
    loadSettings();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle general settings changes
  const handleGeneralSettingChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof typeof generalSettings;
    const value = 
      event.target.type === 'checkbox' 
        ? (event.target as HTMLInputElement).checked 
        : event.target.value;
    
    setGeneralSettings({
      ...generalSettings,
      [name]: value,
    });
  };
  
  // Handle notification settings changes
  const handleNotificationSettingChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof typeof notificationSettings;
    const value = 
      event.target.type === 'checkbox' 
        ? (event.target as HTMLInputElement).checked 
        : event.target.value;
    
    setNotificationSettings({
      ...notificationSettings,
      [name]: value,
    });
  };
  
  // Handle performance settings changes
  const handlePerformanceSettingChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent) => {
    const name = event.target.name as keyof typeof performanceSettings;
    const value = 
      event.target.type === 'checkbox' 
        ? (event.target as HTMLInputElement).checked 
        : event.target.value;
    
    setPerformanceSettings({
      ...performanceSettings,
      [name]: value,
    });
  };
  
  // Handle advanced settings changes
  const handleAdvancedSettingChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = event.target.name as keyof typeof advancedSettings;
    const value = 
      event.target.type === 'checkbox' 
        ? (event.target as HTMLInputElement).checked 
        : event.target.value;
    
    setAdvancedSettings({
      ...advancedSettings,
      [name]: value,
    });
  };

  // Save all settings
  const saveSettings = async () => {
    setSaveLoading(true);
    
    // Simulate saving settings
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, this would call the Electron API to save settings
    
    setSaveLoading(false);
    setSnackbarMessage('Settings saved successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // Reset all settings to default
  const resetSettings = async () => {
    setShowResetConfirm(false);
    setSaveLoading(true);
    
    // Simulate resetting settings
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset all settings to their default values
    setGeneralSettings({
      appTheme: 'system',
      startMinimized: false,
      closeToTray: true,
      checkForUpdates: true,
      deleteLogsAfter: 30,
      maxConcurrentBackups: 1,
      tempDirectory: '/tmp',
    });
    
    setNotificationSettings({
      showNotifications: true,
      notifyBackupStart: true,
      notifyBackupComplete: true,
      notifyBackupFailed: true,
      notifyLowSpace: true,
      lowSpaceThreshold: 10,
    });
    
    setPerformanceSettings({
      compressionLevel: 6,
      maxCpuUsage: 50,
      maxMemoryUsage: 2048,
      ioNiceness: 'normal',
      networkBandwidthLimit: 0,
      enableMultithreading: true,
    });
    
    setAdvancedSettings({
      debugMode: false,
      customLogPath: '',
      enableExperimentalFeatures: false,
      autoRepairCorruptBackups: true,
      retryFailedBackups: 3,
      verboseLogging: false,
    });
    
    setSaveLoading(false);
    setSnackbarMessage('Settings reset to defaults');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };
  
  // Clear application cache
  const clearCache = async () => {
    setSaveLoading(true);
    
    // Simulate clearing cache
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    setSaveLoading(false);
    setSnackbarMessage('Application cache cleared');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // Export debug logs
  const exportLogs = async () => {
    // In a real app, this would call the Electron API to export logs
    setSnackbarMessage('Debug logs exported to desktop');
    setSnackbarSeverity('info');
    setSnackbarOpen(true);
  };
  
  // Verify database integrity
  const verifyDatabase = async () => {
    setSaveLoading(true);
    
    // Simulate verifying database
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSaveLoading(false);
    setSnackbarMessage('Database integrity verified');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // Select directory dialog
  const selectDirectory = (setting: 'tempDirectory' | 'customLogPath') => {
    // In a real app, this would call the Electron API to show a directory picker
    // For demo purposes, just use a fake path
    const fakePath = setting === 'tempDirectory' 
      ? '/home/user/temp' 
      : '/home/user/logs';
    
    if (setting === 'tempDirectory') {
      setGeneralSettings({
        ...generalSettings,
        tempDirectory: fakePath,
      });
    } else if (setting === 'customLogPath') {
      setAdvancedSettings({
        ...advancedSettings,
        customLogPath: fakePath,
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ width: '100%', mt: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="General" {...a11yProps(0)} />
          <Tab label="Notifications" {...a11yProps(1)} />
          <Tab label="Performance" {...a11yProps(2)} />
          <Tab label="Advanced" {...a11yProps(3)} />
          <Tab label="Debug Info" {...a11yProps(4)} />
        </Tabs>
        
        {/* General Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="theme-select-label">Application Theme</InputLabel>
                <Select
                  labelId="theme-select-label"
                  id="appTheme"
                  name="appTheme"
                  value={generalSettings.appTheme}
                  onChange={handleGeneralSettingChange}
                  label="Application Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System Default</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Delete Logs After (days)"
                name="deleteLogsAfter"
                value={generalSettings.deleteLogsAfter}
                onChange={handleGeneralSettingChange}
                inputProps={{ min: 0, max: 365 }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Concurrent Backups"
                name="maxConcurrentBackups"
                value={generalSettings.maxConcurrentBackups}
                onChange={handleGeneralSettingChange}
                inputProps={{ min: 1, max: 10 }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Temporary Directory"
                name="tempDirectory"
                value={generalSettings.tempDirectory}
                onChange={handleGeneralSettingChange}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      onClick={() => selectDirectory('tempDirectory')}
                      edge="end"
                    >
                      <FolderIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalSettings.startMinimized}
                    onChange={handleGeneralSettingChange}
                    name="startMinimized"
                  />
                }
                label="Start Application Minimized"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalSettings.closeToTray}
                    onChange={handleGeneralSettingChange}
                    name="closeToTray"
                  />
                }
                label="Close to System Tray Instead of Exiting"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalSettings.checkForUpdates}
                    onChange={handleGeneralSettingChange}
                    name="checkForUpdates"
                  />
                }
                label="Automatically Check for Updates"
              />
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Notification Settings */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.showNotifications}
                    onChange={handleNotificationSettingChange}
                    name="showNotifications"
                  />
                }
                label="Show Desktop Notifications"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                The following notification types will only be shown if desktop notifications are enabled.
              </Alert>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.notifyBackupStart}
                    onChange={handleNotificationSettingChange}
                    name="notifyBackupStart"
                    disabled={!notificationSettings.showNotifications}
                  />
                }
                label="Backup Started"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.notifyBackupComplete}
                    onChange={handleNotificationSettingChange}
                    name="notifyBackupComplete"
                    disabled={!notificationSettings.showNotifications}
                  />
                }
                label="Backup Completed"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.notifyBackupFailed}
                    onChange={handleNotificationSettingChange}
                    name="notifyBackupFailed"
                    disabled={!notificationSettings.showNotifications}
                  />
                }
                label="Backup Failed"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.notifyLowSpace}
                    onChange={handleNotificationSettingChange}
                    name="notifyLowSpace"
                    disabled={!notificationSettings.showNotifications}
                  />
                }
                label="Low Disk Space"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Low Space Threshold (GB)"
                name="lowSpaceThreshold"
                value={notificationSettings.lowSpaceThreshold}
                onChange={handleNotificationSettingChange}
                inputProps={{ min: 1, max: 100 }}
                margin="normal"
                disabled={!notificationSettings.showNotifications || !notificationSettings.notifyLowSpace}
              />
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Performance Settings */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="compression-level-label">Compression Level</InputLabel>
                <Select
                  labelId="compression-level-label"
                  id="compressionLevel"
                  name="compressionLevel"
                  value={performanceSettings.compressionLevel}
                  onChange={handlePerformanceSettingChange}
                  label="Compression Level"
                >
                  <MenuItem value={0}>No Compression</MenuItem>
                  <MenuItem value={1}>Fastest (Lowest Compression)</MenuItem>
                  <MenuItem value={3}>Low</MenuItem>
                  <MenuItem value={6}>Balanced (Default)</MenuItem>
                  <MenuItem value={9}>Maximum Compression (Slowest)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum CPU Usage (%)"
                name="maxCpuUsage"
                value={performanceSettings.maxCpuUsage}
                onChange={handlePerformanceSettingChange}
                inputProps={{ min: 10, max: 100 }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Memory Usage (MB)"
                name="maxMemoryUsage"
                value={performanceSettings.maxMemoryUsage}
                onChange={handlePerformanceSettingChange}
                inputProps={{ min: 512, max: 8192 }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="io-niceness-label">I/O Priority</InputLabel>
                <Select
                  labelId="io-niceness-label"
                  id="ioNiceness"
                  name="ioNiceness"
                  value={performanceSettings.ioNiceness}
                  onChange={handlePerformanceSettingChange}
                  label="I/O Priority"
                >
                  <MenuItem value="low">Low (Minimal Impact)</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High (Faster Backups)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Network Bandwidth Limit (MB/s, 0 = unlimited)"
                name="networkBandwidthLimit"
                value={performanceSettings.networkBandwidthLimit}
                onChange={handlePerformanceSettingChange}
                inputProps={{ min: 0, max: 1000 }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={performanceSettings.enableMultithreading}
                    onChange={handlePerformanceSettingChange}
                    name="enableMultithreading"
                  />
                }
                label="Enable Multithreading"
              />
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Advanced Settings */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                These settings are for advanced users. Incorrect configuration may cause issues with your backups.
              </Alert>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Retry Failed Backups (count)"
                name="retryFailedBackups"
                value={advancedSettings.retryFailedBackups}
                onChange={handleAdvancedSettingChange}
                inputProps={{ min: 0, max: 10 }}
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Custom Log Path"
                name="customLogPath"
                value={advancedSettings.customLogPath}
                onChange={handleAdvancedSettingChange}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <IconButton 
                      onClick={() => selectDirectory('customLogPath')}
                      edge="end"
                    >
                      <FolderIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedSettings.debugMode}
                    onChange={handleAdvancedSettingChange}
                    name="debugMode"
                  />
                }
                label="Debug Mode"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedSettings.verboseLogging}
                    onChange={handleAdvancedSettingChange}
                    name="verboseLogging"
                  />
                }
                label="Verbose Logging"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedSettings.autoRepairCorruptBackups}
                    onChange={handleAdvancedSettingChange}
                    name="autoRepairCorruptBackups"
                  />
                }
                label="Automatically Repair Corrupt Backups"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={advancedSettings.enableExperimentalFeatures}
                    onChange={handleAdvancedSettingChange}
                    name="enableExperimentalFeatures"
                  />
                }
                label="Enable Experimental Features"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Maintenance Options
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={clearCache}
                  sx={{ mr: 2, mb: 2 }}
                >
                  Clear Application Cache
                </Button>
                
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={verifyDatabase}
                  sx={{ mr: 2, mb: 2 }}
                >
                  Verify Database Integrity
                </Button>
                
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={exportLogs}
                  sx={{ mb: 2 }}
                >
                  Export Debug Logs
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Debug Info */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Application Information
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        GUI Version
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.appVersion}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Core Engine Version
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.coreBinaryVersion}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        System Information
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.systemInfo}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              <Typography variant="subtitle1" gutterBottom>
                Current Status
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Running Backup Jobs
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.runningBackups}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Pending Backup Jobs
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.pendingBackups}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Database Size
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.dbSize}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Log Size
                      </Typography>
                      <Typography variant="body1">
                        {debugStats.logSize}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                >
                  Refresh Statistics
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<BugReportIcon />}
                >
                  Generate Diagnostic Report
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
      
      {/* Action Buttons (Save/Reset) */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="error"
          onClick={() => setShowResetConfirm(true)}
          disabled={saveLoading}
        >
          Reset to Defaults
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={saveSettings}
          disabled={saveLoading}
        >
          Save Settings
        </Button>
      </Box>
      
      {/* Loading indicator when saving */}
      {saveLoading && (
        <LinearProgress sx={{ mt: 2 }} />
      )}
      
      {/* Reset confirmation dialog */}
      <Dialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
      >
        <DialogTitle>Reset All Settings?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will reset all settings to their default values. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetConfirm(false)}>Cancel</Button>
          <Button onClick={resetSettings} color="error">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage; 