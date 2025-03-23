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
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Checkbox,
  ListItemButton,
  IconButton,
  Breadcrumbs,
  Link,
  SelectChangeEvent,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Restore as RestoreIcon,
  NavigateNext as NavigateNextIcon,
  ArrowUpward as ArrowUpIcon,
  Search as SearchIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Mock types
interface BackupProfile {
  id: string;
  name: string;
  sourcePath: string;
  destinationPath: string;
  lastBackupTime: Date | null;
}

interface BackupVersion {
  id: string;
  profileId: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  fileCount: number;
  size: number;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

const RestorePage: React.FC = () => {
  const navigate = useNavigate();
  
  // Steps for the restore process
  const steps = ['Select Backup', 'Select Files', 'Restore Options'];
  const [activeStep, setActiveStep] = useState(0);
  
  // State for profile selection
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  
  // State for backup version selection
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [backupVersions, setBackupVersions] = useState<BackupVersion[]>([]);
  
  // State for file browsing and selection
  const [currentPath, setCurrentPath] = useState<string>('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // State for restore options
  const [restoreOptions, setRestoreOptions] = useState({
    destinationPath: '',
    overwriteExisting: false,
    preservePermissions: true,
  });
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Restore progress
  const [restoreProgress, setRestoreProgress] = useState({
    inProgress: false,
    progress: 0,
    currentFile: '',
    filesRestored: 0,
    totalFiles: 0,
  });

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
            lastBackupTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          },
          {
            id: '2',
            name: 'Documents',
            sourcePath: '/home/user/Documents',
            destinationPath: '/media/backup/documents',
            lastBackupTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
          {
            id: '3',
            name: 'Projects',
            sourcePath: '/home/user/Projects',
            destinationPath: '/media/backup/projects',
            lastBackupTime: null,
          },
        ];
        
        setProfiles(mockProfiles);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  // Fetch backup versions when profile is selected
  useEffect(() => {
    if (!selectedProfileId) return;
    
    const fetchBackupVersions = async () => {
      setLoading(true);
      
      try {
        // In real implementation, would fetch from electronAPI
        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        const mockVersions: BackupVersion[] = [
          {
            id: 'v1',
            profileId: selectedProfileId,
            timestamp: new Date(now.getTime() - oneDayMs), // 1 day ago
            type: 'incremental',
            fileCount: 1240,
            size: 2.3 * 1024 * 1024 * 1024, // 2.3 GB
          },
          {
            id: 'v2',
            profileId: selectedProfileId,
            timestamp: new Date(now.getTime() - 3 * oneDayMs), // 3 days ago
            type: 'incremental',
            fileCount: 1210,
            size: 2.1 * 1024 * 1024 * 1024, // 2.1 GB
          },
          {
            id: 'v3',
            profileId: selectedProfileId,
            timestamp: new Date(now.getTime() - 7 * oneDayMs), // 7 days ago
            type: 'full',
            fileCount: 5300,
            size: 5.7 * 1024 * 1024 * 1024, // 5.7 GB
          },
        ];
        
        setBackupVersions(mockVersions);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching backup versions:', error);
        setLoading(false);
      }
    };

    fetchBackupVersions();
  }, [selectedProfileId]);

  // Fetch files when version is selected or directory changes
  useEffect(() => {
    if (!selectedVersionId || activeStep !== 1) return;
    
    const fetchFiles = async () => {
      setLoading(true);
      
      try {
        // In real implementation, would fetch from electronAPI
        // For now, use mock data
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
        
        // Mock files based on the current path
        let mockFiles: FileEntry[] = [];
        
        if (!currentPath) {
          // Root directory
          mockFiles = [
            {
              name: 'Documents',
              path: '/Documents',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'Pictures',
              path: '/Pictures',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'Videos',
              path: '/Videos',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'notes.txt',
              path: '/notes.txt',
              isDirectory: false,
              size: 1024 * 12, // 12 KB
              modifiedTime: new Date(),
            },
            {
              name: 'backup-report.pdf',
              path: '/backup-report.pdf',
              isDirectory: false,
              size: 1024 * 1024 * 3.2, // 3.2 MB
              modifiedTime: new Date(),
            },
          ];
        } else if (currentPath === '/Documents') {
          mockFiles = [
            {
              name: 'Work',
              path: '/Documents/Work',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'Personal',
              path: '/Documents/Personal',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'report.docx',
              path: '/Documents/report.docx',
              isDirectory: false,
              size: 1024 * 1024 * 1.7, // 1.7 MB
              modifiedTime: new Date(),
            },
            {
              name: 'budget.xlsx',
              path: '/Documents/budget.xlsx',
              isDirectory: false,
              size: 1024 * 1024 * 0.5, // 0.5 MB
              modifiedTime: new Date(),
            },
          ];
        } else if (currentPath === '/Pictures') {
          mockFiles = [
            {
              name: 'Vacation',
              path: '/Pictures/Vacation',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'Family',
              path: '/Pictures/Family',
              isDirectory: true,
              size: 0,
              modifiedTime: new Date(),
            },
            {
              name: 'photo1.jpg',
              path: '/Pictures/photo1.jpg',
              isDirectory: false,
              size: 1024 * 1024 * 2.3, // 2.3 MB
              modifiedTime: new Date(),
            },
            {
              name: 'photo2.jpg',
              path: '/Pictures/photo2.jpg',
              isDirectory: false,
              size: 1024 * 1024 * 3.1, // 3.1 MB
              modifiedTime: new Date(),
            },
          ];
        } else {
          // Other paths - show some generic files
          mockFiles = [
            {
              name: 'file1.txt',
              path: `${currentPath}/file1.txt`,
              isDirectory: false,
              size: 1024 * 10, // 10 KB
              modifiedTime: new Date(),
            },
            {
              name: 'file2.txt',
              path: `${currentPath}/file2.txt`,
              isDirectory: false,
              size: 1024 * 15, // 15 KB
              modifiedTime: new Date(),
            },
          ];
        }
        
        setFileEntries(mockFiles);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching files:', error);
        setLoading(false);
      }
    };

    fetchFiles();
  }, [selectedVersionId, currentPath, activeStep]);

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
    setSelectedVersionId('');
    setBackupVersions([]);
  };

  // Handle version selection
  const handleVersionSelect = (event: SelectChangeEvent) => {
    setSelectedVersionId(event.target.value);
    setCurrentPath('');
    setPathHistory([]);
    setFileEntries([]);
    setSelectedFiles([]);
  };

  // Navigate to a directory
  const navigateToDirectory = (path: string) => {
    setPathHistory(prev => [...prev, currentPath]);
    setCurrentPath(path);
  };

  // Navigate up one directory
  const navigateUp = () => {
    if (pathHistory.length === 0) return;
    
    const previousPath = pathHistory[pathHistory.length - 1];
    setPathHistory(prev => prev.slice(0, -1));
    setCurrentPath(previousPath);
  };

  // Handle file/directory selection
  const toggleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(path)) {
        return prev.filter(p => p !== path);
      } else {
        return [...prev, path];
      }
    });
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Start restore process
  const startRestore = async () => {
    if (selectedFiles.length === 0) return;
    
    // Set initial progress
    setRestoreProgress({
      inProgress: true,
      progress: 0,
      currentFile: 'Preparing restore...',
      filesRestored: 0,
      totalFiles: selectedFiles.length,
    });
    
    // In a real implementation, this would call the Electron API to start the restore
    // For demo purposes, we'll simulate progress updates
    let filesRestored = 0;
    
    const updateInterval = setInterval(() => {
      if (filesRestored >= selectedFiles.length) {
        clearInterval(updateInterval);
        
        setRestoreProgress(prev => ({
          ...prev,
          inProgress: false,
          progress: 100,
          filesRestored: selectedFiles.length,
          currentFile: 'Restore completed',
        }));
        
        // Navigate to dashboard after a delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
        
        return;
      }
      
      // Simulate restoring 1-3 files per update
      const increment = Math.floor(Math.random() * 3) + 1;
      filesRestored = Math.min(filesRestored + increment, selectedFiles.length);
      
      // Calculate progress percentage
      const progress = Math.round((filesRestored / selectedFiles.length) * 100);
      
      // Mock current file
      const currentFile = selectedFiles[filesRestored - 1] || 'Processing...';
      
      setRestoreProgress(prev => ({
        ...prev,
        progress,
        currentFile,
        filesRestored,
      }));
    }, 500); // Update every 500ms for the demo
    
    // Cleanup function - not really used in this demo
    return () => clearInterval(updateInterval);
  };

  // Render functions for each step
  const renderSelectBackup = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Select Backup to Restore From
      </Typography>
      
      <FormControl fullWidth margin="normal">
        <InputLabel id="profile-select-label">Backup Profile</InputLabel>
        <Select
          labelId="profile-select-label"
          id="profile-select"
          value={selectedProfileId}
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
      
      {selectedProfileId && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
            Select Backup Version
          </Typography>
          
          {backupVersions.length > 0 ? (
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
              {backupVersions.map((version) => (
                <Card key={version.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item>
                        <Checkbox
                          checked={selectedVersionId === version.id}
                          onChange={() => setSelectedVersionId(version.id)}
                          color="primary"
                        />
                      </Grid>
                      <Grid item xs>
                        <Typography variant="subtitle1" component="div">
                          {version.timestamp.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {version.type === 'full' ? 'Full Backup' : 'Incremental Backup'}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Typography variant="body2">
                          {formatBytes(version.size)}
                        </Typography>
                        <Typography variant="body2">
                          {version.fileCount} files
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No backup versions available for this profile.
            </Typography>
          )}
        </>
      )}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!selectedVersionId}
        >
          Next
        </Button>
      </Box>
    </Paper>
  );

  const renderSelectFiles = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Select Files to Restore
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => {
              setCurrentPath('');
              setPathHistory([]);
            }}
          >
            Root
          </Link>
          
          {currentPath.split('/')
            .filter(Boolean)
            .map((part, index, parts) => {
              const path = '/' + parts.slice(0, index + 1).join('/');
              return (
                <Link
                  key={path}
                  component="button"
                  underline="hover"
                  color="inherit"
                  onClick={() => {
                    const newPath = path;
                    const newPathHistory = pathHistory.slice(0, pathHistory.findIndex(p => p === newPath) + 1);
                    setCurrentPath(newPath);
                    setPathHistory(newPathHistory);
                  }}
                >
                  {part}
                </Link>
              );
            })}
        </Breadcrumbs>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton 
          onClick={navigateUp} 
          disabled={pathHistory.length === 0}
          size="small"
        >
          <ArrowUpIcon />
        </IconButton>
        <Typography variant="body1" sx={{ ml: 1 }}>
          Current Directory: <code>{currentPath || '/'}</code>
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {fileEntries.length > 0 ? (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {fileEntries.map((entry) => (
            <ListItem
              key={entry.path}
              disablePadding
              secondaryAction={
                entry.isDirectory ? null : (
                  <Checkbox
                    edge="end"
                    checked={selectedFiles.includes(entry.path)}
                    onChange={() => toggleFileSelection(entry.path)}
                  />
                )
              }
            >
              <ListItemButton
                onClick={() => {
                  if (entry.isDirectory) {
                    navigateToDirectory(entry.path);
                  } else {
                    toggleFileSelection(entry.path);
                  }
                }}
              >
                <ListItemIcon>
                  {entry.isDirectory ? <FolderIcon /> : <FileIcon />}
                </ListItemIcon>
                <ListItemText 
                  primary={entry.name} 
                  secondary={entry.isDirectory ? 'Directory' : `${formatBytes(entry.size)}, modified ${entry.modifiedTime.toLocaleString()}`} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body1" color="text.secondary">
          No files or directories found in this location.
        </Typography>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <Box>
        <Typography variant="subtitle1">
          Selected Files: {selectedFiles.length}
        </Typography>
        {selectedFiles.length > 0 && (
          <List dense>
            {selectedFiles.slice(0, 5).map((path) => (
              <ListItem key={path}>
                <ListItemIcon>
                  <FileIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={path} />
              </ListItem>
            ))}
            {selectedFiles.length > 5 && (
              <ListItem>
                <ListItemText primary={`And ${selectedFiles.length - 5} more...`} />
              </ListItem>
            )}
          </List>
        )}
      </Box>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={selectedFiles.length === 0}
        >
          Next
        </Button>
      </Box>
    </Paper>
  );

  const renderRestoreOptions = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Restore Options
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Destination Path"
            fullWidth
            value={restoreOptions.destinationPath}
            onChange={(e) => setRestoreOptions(prev => ({ ...prev, destinationPath: e.target.value }))}
            placeholder="Leave empty to restore to original location"
            helperText="Specify a different destination path or leave empty to restore to original location"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <Grid container>
              <Grid item xs={12}>
                <Checkbox
                  checked={restoreOptions.overwriteExisting}
                  onChange={(e) => setRestoreOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                  color="primary"
                />
                <Typography variant="body1" component="span">
                  Overwrite existing files
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Checkbox
                  checked={restoreOptions.preservePermissions}
                  onChange={(e) => setRestoreOptions(prev => ({ ...prev, preservePermissions: e.target.checked }))}
                  color="primary"
                />
                <Typography variant="body1" component="span">
                  Preserve permissions and ownership
                </Typography>
              </Grid>
            </Grid>
          </FormControl>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Summary
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Selected Version
                </Typography>
                <Typography variant="body1">
                  {backupVersions.find(v => v.id === selectedVersionId)?.timestamp.toLocaleString() || 'Unknown'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {backupVersions.find(v => v.id === selectedVersionId)?.type === 'full' ? 'Full Backup' : 'Incremental Backup'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Restore Details
                </Typography>
                <Typography variant="body1">
                  Files to restore: {selectedFiles.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Destination: {restoreOptions.destinationPath || 'Original location'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RestoreIcon />}
          onClick={startRestore}
        >
          Start Restore
        </Button>
      </Box>
    </Paper>
  );

  const renderRestoreProgress = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Restore Progress
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <LinearProgress 
          variant="determinate" 
          value={restoreProgress.progress} 
          sx={{ height: 10, borderRadius: 5, mb: 1 }}
        />
        <Typography variant="body2" gutterBottom>
          {restoreProgress.progress}% Complete
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" gutterBottom>
            Details
          </Typography>
          
          <Typography variant="body2" gutterBottom>
            Files Restored: {restoreProgress.filesRestored} / {restoreProgress.totalFiles}
          </Typography>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" gutterBottom>
            Current File
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {restoreProgress.currentFile}
          </Typography>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        {!restoreProgress.inProgress && (
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

  if (loading && activeStep === 0) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Restore
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Restore
      </Typography>
      
      {!restoreProgress.inProgress && (
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}
      
      {restoreProgress.inProgress ? renderRestoreProgress() : (
        <>
          {activeStep === 0 && renderSelectBackup()}
          {activeStep === 1 && renderSelectFiles()}
          {activeStep === 2 && renderRestoreOptions()}
        </>
      )}
    </Box>
  );
};

export default RestorePage;