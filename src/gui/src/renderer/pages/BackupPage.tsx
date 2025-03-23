import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  FormControlLabel, 
  Checkbox, 
  Grid, 
  Card, 
  CardContent, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import { 
  Folder as FolderIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon, 
  BackupOutlined as BackupIcon,
  CheckCircleOutline as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// Mock types
interface BackupProfile {
  id: string;
  name: string;
  sourcePath: string;
  destinationPath: string;
  excludePaths: string[];
  compressionLevel: number;
  encryptionEnabled: boolean;
  scheduleEnabled: boolean;
  scheduleFrequency: string;
  scheduleTime: string;
  retention: {
    keepDaily: number;
    keepWeekly: number;
    keepMonthly: number;
  };
}

interface BackupProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  bytesProcessed: number;
  totalBytes: number;
  startTime: Date | null;
  endTime: Date | null;
  errorMessage: string | null;
}

const BackupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const profileId = queryParams.get('profile');

  // Steps for the backup process
  const steps = ['Select Profile', 'Configure Options', 'Review & Start'];
  const [activeStep, setActiveStep] = useState(0);
  
  // State for profile selection and creation
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(profileId);
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for backup options
  const [backupOptions, setBackupOptions] = useState({
    fullBackup: false,
    compressionLevel: 6,
    encryptionEnabled: false,
    verifyAfterBackup: true,
    additionalExcludePaths: [] as string[],
    newExcludePath: '',
  });
  
  // State for backup progress
  const [backupProgress, setBackupProgress] = useState<BackupProgress>({
    status: 'idle',
    currentFile: '',
    filesProcessed: 0,
    totalFiles: 0,
    bytesProcessed: 0,
    totalBytes: 0,
    startTime: null,
    endTime: null,
    errorMessage: null
  });

  // Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch profiles when component mounts
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // In real implementation, would fetch from electronAPI
        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        const mockProfiles: BackupProfile[] = [
          {
            id: '1',
            name: 'Home Folder',
            sourcePath: '/home/user',
            destinationPath: '/media/backup/home',
            excludePaths: [
              '/home/user/Downloads',
              '/home/user/.cache',
              '/home/user/tmp'
            ],
            compressionLevel: 6,
            encryptionEnabled: false,
            scheduleEnabled: true,
            scheduleFrequency: 'daily',
            scheduleTime: '02:00',
            retention: {
              keepDaily: 7,
              keepWeekly: 4,
              keepMonthly: 6
            }
          },
          {
            id: '2',
            name: 'Documents',
            sourcePath: '/home/user/Documents',
            destinationPath: '/media/backup/documents',
            excludePaths: [],
            compressionLevel: 9,
            encryptionEnabled: true,
            scheduleEnabled: true,
            scheduleFrequency: 'weekly',
            scheduleTime: '03:00',
            retention: {
              keepDaily: 3,
              keepWeekly: 4,
              keepMonthly: 3
            }
          },
          {
            id: '3',
            name: 'Projects',
            sourcePath: '/home/user/Projects',
            destinationPath: '/media/backup/projects',
            excludePaths: [
              '/home/user/Projects/node_modules',
              '/home/user/Projects/.git'
            ],
            compressionLevel: 6,
            encryptionEnabled: false,
            scheduleEnabled: false,
            scheduleFrequency: '',
            scheduleTime: '',
            retention: {
              keepDaily: 5,
              keepWeekly: 2,
              keepMonthly: 1
            }
          }
        ];
        
        setProfiles(mockProfiles);
        
        // If we have a profile ID from query params, select it
        if (profileId) {
          const validProfile = mockProfiles.find(p => p.id === profileId);
          if (validProfile) {
            setSelectedProfileId(profileId);
            // Skip to the second step if profile was provided in URL
            setActiveStep(1);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [profileId]);

  // Get the selected profile
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || null;

  // Handle next step
  const handleNext = () => {
    setActiveStep(prevStep => prevStep + 1);
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Handle profile selection
  const handleProfileSelect = (event: SelectChangeEvent) => {
    setSelectedProfileId(event.target.value);
  };

  // Handle backup option changes
  const handleOptionChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const name = event.target.name as string;
    const value = event.target.type === 'checkbox' 
      ? (event as React.ChangeEvent<HTMLInputElement>).target.checked 
      : event.target.value;
    
    setBackupOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add exclude path
  const handleAddExcludePath = () => {
    if (backupOptions.newExcludePath.trim()) {
      setBackupOptions(prev => ({
        ...prev,
        additionalExcludePaths: [...prev.additionalExcludePaths, prev.newExcludePath.trim()],
        newExcludePath: ''
      }));
    }
  };

  // Remove exclude path
  const handleRemoveExcludePath = (index: number) => {
    setBackupOptions(prev => ({
      ...prev,
      additionalExcludePaths: prev.additionalExcludePaths.filter((_, i) => i !== index)
    }));
  };

  // Start backup process
  const startBackup = async () => {
    if (!selectedProfile) return;
    
    setShowConfirmDialog(false);
    
    // Set initial progress
    setBackupProgress({
      status: 'running',
      currentFile: 'Preparing backup...',
      filesProcessed: 0,
      totalFiles: 100, // These would be determined by the actual backup process
      bytesProcessed: 0,
      totalBytes: 1024 * 1024 * 1024, // 1 GB example
      startTime: new Date(),
      endTime: null,
      errorMessage: null
    });
    
    // In a real implementation, this would call the Electron API to start the backup
    // For demo purposes, we'll simulate progress updates
    const mockBackupProcess = () => {
      const totalFiles = 100;
      const totalBytes = 1024 * 1024 * 1024; // 1 GB
      let filesProcessed = 0;
      let bytesProcessed = 0;
      
      const updateInterval = setInterval(() => {
        if (filesProcessed >= totalFiles) {
          clearInterval(updateInterval);
          
          setBackupProgress(prev => ({
            ...prev,
            status: 'completed',
            filesProcessed: totalFiles,
            bytesProcessed: totalBytes,
            currentFile: 'Backup completed successfully',
            endTime: new Date()
          }));
          
          return;
        }
        
        // Simulate processing 1-3 files per update
        const filesIncrease = Math.floor(Math.random() * 3) + 1;
        filesProcessed = Math.min(filesProcessed + filesIncrease, totalFiles);
        
        // Simulate processed bytes (more variance)
        const bytesIncrease = Math.floor(Math.random() * 50 * 1024 * 1024) + 10 * 1024 * 1024;
        bytesProcessed = Math.min(bytesProcessed + bytesIncrease, totalBytes);
        
        // Mock current file
        const currentFile = `/home/user/some/path/to/file_${filesProcessed}.txt`;
        
        setBackupProgress(prev => ({
          ...prev,
          filesProcessed,
          bytesProcessed,
          currentFile
        }));
      }, 500); // Update every 500ms for the demo
      
      // Return cleanup function
      return () => clearInterval(updateInterval);
    };
    
    const cleanup = mockBackupProcess();
    
    // Cleanup on component unmount
    return () => cleanup();
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (backupProgress.totalBytes === 0) return 0;
    return Math.round((backupProgress.bytesProcessed / backupProgress.totalBytes) * 100);
  };

  // Render functions for each step
  const renderProfileSelection = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Select Backup Profile
      </Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="profile-select-label">Backup Profile</InputLabel>
        <Select
          labelId="profile-select-label"
          id="profile-select"
          value={selectedProfileId || ''}
          onChange={handleProfileSelect}
          label="Backup Profile"
        >
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              {profile.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {selectedProfile && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Profile Details
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Source Path"
                fullWidth
                value={selectedProfile.sourcePath}
                InputProps={{ readOnly: true }}
                variant="filled"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Destination Path"
                fullWidth
                value={selectedProfile.destinationPath}
                InputProps={{ readOnly: true }}
                variant="filled"
                size="small"
              />
            </Grid>
          </Grid>
          
          {selectedProfile.excludePaths.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Excluded Paths:
              </Typography>
              <List dense>
                {selectedProfile.excludePaths.map((path, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <FolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={path} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => navigate('/profiles/new')}>
          Create New Profile
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!selectedProfileId}
        >
          Next
        </Button>
      </Box>
    </Paper>
  );

  const renderBackupOptions = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Backup Options
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={backupOptions.fullBackup}
                onChange={handleOptionChange}
                name="fullBackup"
              />
            }
            label="Perform full backup (instead of incremental)"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="compression-level-label">Compression Level</InputLabel>
            <Select
              labelId="compression-level-label"
              id="compression-level"
              value={backupOptions.compressionLevel}
              onChange={handleOptionChange}
              name="compressionLevel"
              label="Compression Level"
            >
              <MenuItem value={0}>No Compression</MenuItem>
              <MenuItem value={1}>Fastest (Lowest Compression)</MenuItem>
              <MenuItem value={6}>Balanced (Default)</MenuItem>
              <MenuItem value={9}>Maximum Compression (Slowest)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={backupOptions.encryptionEnabled}
                onChange={handleOptionChange}
                name="encryptionEnabled"
              />
            }
            label="Enable Encryption"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={backupOptions.verifyAfterBackup}
                onChange={handleOptionChange}
                name="verifyAfterBackup"
              />
            }
            label="Verify backup after completion"
          />
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Additional Exclude Paths
          </Typography>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              label="Path to exclude"
              fullWidth
              value={backupOptions.newExcludePath}
              onChange={handleOptionChange}
              name="newExcludePath"
              size="small"
            />
            <IconButton 
              color="primary" 
              onClick={handleAddExcludePath}
              disabled={!backupOptions.newExcludePath.trim()}
            >
              <AddIcon />
            </IconButton>
          </Box>
          
          {backupOptions.additionalExcludePaths.length > 0 && (
            <List>
              {backupOptions.additionalExcludePaths.map((path, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveExcludePath(index)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText primary={path} />
                </ListItem>
              ))}
            </List>
          )}
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
        >
          Next
        </Button>
      </Box>
    </Paper>
  );

  const renderReviewAndStart = () => {
    if (!selectedProfile) return null;
    
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Review Backup Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Profile Details
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedProfile.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Source:</strong> {selectedProfile.sourcePath}
                </Typography>
                <Typography variant="body2">
                  <strong>Destination:</strong> {selectedProfile.destinationPath}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Backup Options
                </Typography>
                <Typography variant="body2">
                  <strong>Backup Type:</strong> {backupOptions.fullBackup ? 'Full Backup' : 'Incremental Backup'}
                </Typography>
                <Typography variant="body2">
                  <strong>Compression:</strong> Level {backupOptions.compressionLevel}
                </Typography>
                <Typography variant="body2">
                  <strong>Encryption:</strong> {backupOptions.encryptionEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
                <Typography variant="body2">
                  <strong>Verification:</strong> {backupOptions.verifyAfterBackup ? 'Enabled' : 'Disabled'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Excluded Paths
            </Typography>
            <List dense>
              {selectedProfile.excludePaths.concat(backupOptions.additionalExcludePaths).map((path, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={path} />
                </ListItem>
              ))}
              {selectedProfile.excludePaths.length + backupOptions.additionalExcludePaths.length === 0 && (
                <ListItem>
                  <ListItemText primary="No paths excluded" />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleBack}>
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BackupIcon />}
            onClick={() => setShowConfirmDialog(true)}
          >
            Start Backup
          </Button>
        </Box>
      </Paper>
    );
  };

  const renderBackupProgress = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Backup Progress
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          {backupProgress.status === 'running' && 'Backup in progress...'}
          {backupProgress.status === 'completed' && 'Backup completed successfully!'}
          {backupProgress.status === 'failed' && 'Backup failed!'}
        </Typography>
        
        {backupProgress.status === 'running' && (
          <>
            <LinearProgress 
              variant="determinate" 
              value={getProgressPercentage()} 
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
            <Typography variant="body2" gutterBottom>
              {getProgressPercentage()}% Complete
            </Typography>
          </>
        )}
        
        {backupProgress.status === 'completed' && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main', mb: 2 }}>
            <CheckIcon sx={{ mr: 1 }} />
            <Typography variant="body1">
              Backup completed successfully
            </Typography>
          </Box>
        )}
        
        {backupProgress.status === 'failed' && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main', mb: 2 }}>
            <WarningIcon sx={{ mr: 1 }} />
            <Typography variant="body1">
              {backupProgress.errorMessage || 'An unknown error occurred'}
            </Typography>
          </Box>
        )}
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" gutterBottom>
            Details
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            Files: {backupProgress.filesProcessed} / {backupProgress.totalFiles}
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            Data Processed: {formatBytes(backupProgress.bytesProcessed)} / {formatBytes(backupProgress.totalBytes)}
          </Typography>
          
          {backupProgress.startTime && (
            <Typography variant="body2" gutterBottom>
              Start Time: {backupProgress.startTime.toLocaleTimeString()}
            </Typography>
          )}
          
          {backupProgress.endTime && (
            <Typography variant="body2" gutterBottom>
              End Time: {backupProgress.endTime.toLocaleTimeString()}
            </Typography>
          )}
          
          {backupProgress.startTime && backupProgress.endTime && (
            <Typography variant="body2" gutterBottom>
              Duration: {Math.round((backupProgress.endTime.getTime() - backupProgress.startTime.getTime()) / 1000)} seconds
            </Typography>
          )}
        </Grid>
        
        <Grid item xs={12} sm={6}>
          {backupProgress.status === 'running' && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Current File
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {backupProgress.currentFile}
              </Typography>
            </>
          )}
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        {backupProgress.status !== 'running' && (
          <Button
            variant="contained"
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </Button>
        )}
      </Box>
    </Paper>
  );

  // Confirm Dialog
  const renderConfirmDialog = () => (
    <Dialog
      open={showConfirmDialog}
      onClose={() => setShowConfirmDialog(false)}
    >
      <DialogTitle>Confirm Backup</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to start the backup process?
          {backupOptions.fullBackup && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', color: 'warning.main' }}>
              <InfoIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                You have selected a full backup, which may take longer and use more storage space.
              </Typography>
            </Box>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
        <Button onClick={startBackup} variant="contained" color="primary" autoFocus>
          Start Backup
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Content based on step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderProfileSelection();
      case 1:
        return renderBackupOptions();
      case 2:
        return renderReviewAndStart();
      case 3:
        return renderBackupProgress();
      default:
        return 'Unknown step';
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Backup
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Backup
      </Typography>
      
      {backupProgress.status === 'idle' && (
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}
      
      {getStepContent(activeStep)}
      {renderConfirmDialog()}
    </Box>
  );
};

export default BackupPage; 