import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Button, 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  Switch, 
  FormControlLabel, 
  Divider, 
  IconButton, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  ListItemSecondaryAction,
  LinearProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import backupService, { BackupProfile } from '../services/BackupService';

const ProfilesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNew = location.pathname.includes('/new');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // New exclude path field
  const [newExcludePath, setNewExcludePath] = useState('');
  
  // Default profile
  const defaultProfile: BackupProfile = {
    id: '',
    name: '',
    sourcePath: '',
    destinationPath: '',
    excludePaths: [],
    compressionLevel: 6,
    encryptionEnabled: false,
    scheduleEnabled: false,
    scheduleFrequency: 'daily',
    scheduleTime: '02:00',
    retention: {
      keepDaily: 7,
      keepWeekly: 4,
      keepMonthly: 2
    }
  };
  
  // Profile state
  const [profile, setProfile] = useState<BackupProfile>(defaultProfile);
  
  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      
      if (isNew) {
        // Create new profile
        setProfile({
          ...defaultProfile,
          id: `profile_${Date.now()}`
        });
        setLoading(false);
        return;
      }
      
      if (id) {
        try {
          const profileData = await backupService.getProfile(id);
          
          if (profileData) {
            setProfile(profileData);
          } else {
            // Profile not found
            setSnackbarMessage('Profile not found');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            navigate('/profiles');
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          setSnackbarMessage('Error loading profile');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }
      
      setLoading(false);
    };
    
    loadProfile();
  }, [id, isNew, navigate]);
  
  // Handle form changes
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent
  ) => {
    const name = event.target.name as string;
    
    if (!name) return;
    
    const value = 
      event.target.type === 'checkbox' 
        ? (event.target as HTMLInputElement).checked 
        : event.target.value;
    
    // Handle nested fields
    if (name.startsWith('retention.')) {
      const field = name.split('.')[1];
      setProfile({
        ...profile,
        retention: {
          ...profile.retention,
          [field]: Number(value)
        }
      });
    } else {
      setProfile({
        ...profile,
        [name]: value
      });
    }
  };
  
  // Handle directory selection
  const handleSelectDirectory = async (field: 'sourcePath' | 'destinationPath') => {
    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      
      if (selectedPath) {
        setProfile({
          ...profile,
          [field]: selectedPath
        });
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
      setSnackbarMessage('Error selecting directory');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Add exclude path
  const handleAddExcludePath = () => {
    if (newExcludePath.trim()) {
      setProfile({
        ...profile,
        excludePaths: [...profile.excludePaths, newExcludePath.trim()]
      });
      setNewExcludePath('');
    }
  };
  
  // Remove exclude path
  const handleRemoveExcludePath = (index: number) => {
    setProfile({
      ...profile,
      excludePaths: profile.excludePaths.filter((_, i) => i !== index)
    });
  };
  
  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    
    try {
      // Validate form
      if (!profile.name.trim()) {
        setSnackbarMessage('Profile name is required');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setSaving(false);
        return;
      }
      
      if (!profile.sourcePath.trim()) {
        setSnackbarMessage('Source path is required');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setSaving(false);
        return;
      }
      
      if (!profile.destinationPath.trim()) {
        setSnackbarMessage('Destination path is required');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setSaving(false);
        return;
      }
      
      await backupService.saveProfile(profile);
      
      setSnackbarMessage(`Profile "${profile.name}" saved successfully`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Navigate back
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSnackbarMessage('Error saving profile');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    
    setSaving(false);
  };
  
  // Delete profile
  const deleteProfile = async () => {
    setSaving(true);
    setConfirmDelete(false);
    
    try {
      await backupService.deleteProfile(profile.id);
      
      setSnackbarMessage(`Profile "${profile.name}" deleted successfully`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Navigate back
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error deleting profile:', error);
      setSnackbarMessage('Error deleting profile');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
    
    setSaving(false);
  };
  
  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isNew ? 'Create New Profile' : 'Edit Profile'}
        </Typography>
        <LinearProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          {isNew ? 'Create New Profile' : `Edit Profile: ${profile.name}`}
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Profile Name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              required
              error={!profile.name.trim()}
              helperText={!profile.name.trim() ? 'Profile name is required' : ''}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Source Path"
              name="sourcePath"
              value={profile.sourcePath}
              onChange={handleChange}
              required
              error={!profile.sourcePath.trim()}
              helperText={!profile.sourcePath.trim() ? 'Source path is required' : ''}
              InputProps={{
                endAdornment: (
                  <IconButton 
                    onClick={() => handleSelectDirectory('sourcePath')}
                    edge="end"
                  >
                    <FolderIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Destination Path"
              name="destinationPath"
              value={profile.destinationPath}
              onChange={handleChange}
              required
              error={!profile.destinationPath.trim()}
              helperText={!profile.destinationPath.trim() ? 'Destination path is required' : ''}
              InputProps={{
                endAdornment: (
                  <IconButton 
                    onClick={() => handleSelectDirectory('destinationPath')}
                    edge="end"
                  >
                    <FolderIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Backup Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="compression-label">Compression Level</InputLabel>
              <Select
                labelId="compression-label"
                name="compressionLevel"
                value={profile.compressionLevel}
                onChange={handleChange}
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
            <FormControlLabel
              control={
                <Switch
                  checked={profile.encryptionEnabled}
                  onChange={handleChange}
                  name="encryptionEnabled"
                />
              }
              label="Enable Encryption"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Exclude Paths
            </Typography>
            
            <Box sx={{ display: 'flex', mb: 2 }}>
              <TextField
                label="Path to exclude"
                fullWidth
                value={newExcludePath}
                onChange={(e) => setNewExcludePath(e.target.value)}
                size="small"
              />
              <IconButton 
                color="primary" 
                onClick={handleAddExcludePath}
                disabled={!newExcludePath.trim()}
              >
                <AddIcon />
              </IconButton>
            </Box>
            
            {profile.excludePaths.length > 0 ? (
              <List>
                {profile.excludePaths.map((path, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText primary={path} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleRemoveExcludePath(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No paths excluded
              </Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Schedule Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={profile.scheduleEnabled}
                  onChange={handleChange}
                  name="scheduleEnabled"
                />
              }
              label="Enable Scheduled Backups"
            />
          </Grid>
          
          {profile.scheduleEnabled && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="frequency-label">Backup Frequency</InputLabel>
                  <Select
                    labelId="frequency-label"
                    name="scheduleFrequency"
                    value={profile.scheduleFrequency}
                    onChange={handleChange}
                    label="Backup Frequency"
                    disabled={!profile.scheduleEnabled}
                  >
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Backup Time"
                  name="scheduleTime"
                  type="time"
                  value={profile.scheduleTime}
                  onChange={handleChange}
                  disabled={!profile.scheduleEnabled}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Retention Policy
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Keep Daily Backups"
              name="retention.keepDaily"
              value={profile.retention.keepDaily}
              onChange={handleChange}
              inputProps={{ min: 1, max: 30 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Keep Weekly Backups"
              name="retention.keepWeekly"
              value={profile.retention.keepWeekly}
              onChange={handleChange}
              inputProps={{ min: 0, max: 12 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Keep Monthly Backups"
              name="retention.keepMonthly"
              value={profile.retention.keepMonthly}
              onChange={handleChange}
              inputProps={{ min: 0, max: 12 }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 4 }}>
        {!isNew && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
          >
            Delete Profile
          </Button>
        )}
        
        <Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
            disabled={saving}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={saveProfile}
            disabled={saving}
          >
            {isNew ? 'Create Profile' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
      
      {/* Loading indicator */}
      {saving && <LinearProgress sx={{ mt: 2 }} />}
      
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
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
      >
        <DialogTitle>Delete Profile?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the profile "{profile.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button onClick={deleteProfile} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilesPage; 