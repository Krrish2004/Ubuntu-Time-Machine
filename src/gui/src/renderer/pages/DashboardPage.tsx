import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  Storage as StorageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import backupService, { BackupProfile } from '../services/BackupService';

// Define interfaces for the data
interface StorageData {
  total: number;
  used: number;
  available: number;
}

interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  uptime: string;
}

interface RecentBackup {
  date: string;
  status: string;
  size: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  const [storageData, setStorageData] = useState<StorageData>({
    total: 1000,
    used: 450,
    available: 550,
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    cpuUsage: 15,
    memoryUsage: 35,
    uptime: '5 days, 7 hours',
  });
  const [recentBackups, setRecentBackups] = useState<RecentBackup[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load profiles
        const profilesData = await backupService.getProfiles();
        setProfiles(profilesData);
        
        // Load system info
        const systemInfo = await backupService.getSystemInfo();
        
        // Update storage data
        if (systemInfo && systemInfo.storage) {
          setStorageData({
            total: systemInfo.storage.total,
            used: systemInfo.storage.used,
            available: systemInfo.storage.available
          });
        }
        
        // Update system status
        if (systemInfo && systemInfo.cpu && systemInfo.memory) {
          setSystemStatus({
            cpuUsage: systemInfo.cpu.usage,
            memoryUsage: systemInfo.memory.usagePercent,
            uptime: systemInfo.uptime
          });
        }
        
        // Generate mock data for recent backups since the mock core 
        // doesn't provide this information
        const mockRecentBackups: RecentBackup[] = [
          {
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'Success',
            size: '1.2 GB'
          },
          {
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Success',
            size: '1.1 GB'
          },
          {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Success',
            size: '1.3 GB'
          }
        ];

        setRecentBackups(mockRecentBackups);
        
        // Note: In development mode with mock data, we're not trying to fetch real backups
        // since the mock core doesn't provide this functionality
        /*
        // Get recent backups from each profile
        const recentBackupsData: RecentBackup[] = [];
        
        for (const profile of profilesData) {
          try {
            const backups = await backupService.getBackupsList(profile.id);
            
            // Sort by timestamp descending and take the most recent ones
            const sortedBackups = backups
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 3);
            
            for (const backup of sortedBackups) {
              recentBackupsData.push({
                date: backup.timestamp,
                status: backup.status === 'success' ? 'Success' : backup.status === 'error' ? 'Error' : 'Warning',
                size: formatBytes(backup.size)
              });
            }
          } catch (err) {
            console.error(`Error fetching backups for profile ${profile.id}:`, err);
          }
        }
        
        // Sort all backups by date descending and take the most recent ones
        const sortedRecentBackups = recentBackupsData
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4);
        
        setRecentBackups(sortedRecentBackups);
        */
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Helper function to format bytes
  const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const chartData = [
    { name: 'Used', value: storageData.used },
    { name: 'Available', value: storageData.available },
  ];
  
  const COLORS = ['#e95420', '#77216f'];
  
  const handleRunBackup = async (profileId: string) => {
    try {
      const backupId = await backupService.startBackup(profileId);
      navigate(`/backup?profile=${profileId}&backupId=${backupId}`);
    } catch (error) {
      console.error('Error starting backup:', error);
      // Show error notification
    }
  };
  
  const handleEditProfile = (profileId: string) => {
    navigate(`/profiles/${profileId}`);
  };
  
  const handleCreateProfile = () => {
    navigate('/profiles/new');
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button 
                  variant="contained" 
                  startIcon={<BackupIcon />}
                  onClick={() => navigate('/backup')}
                  color="primary"
                  fullWidth
                >
                  Start Backup
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<RestoreIcon />}
                  onClick={() => navigate('/restore')}
                  fullWidth
                >
                  Restore Files
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={handleCreateProfile}
                  fullWidth
                >
                  New Profile
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<SettingsIcon />}
                  onClick={() => navigate('/settings')}
                  fullWidth
                >
                  Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Storage Info */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Status
              </Typography>
              <Box sx={{ height: 180, display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Total: {formatBytes(storageData.total)}
                </Typography>
                <Typography variant="body2" gutterBottom color="primary">
                  Used: {formatBytes(storageData.used)} ({Math.round(storageData.used / storageData.total * 100)}%)
                </Typography>
                <Typography variant="body2" gutterBottom color="secondary">
                  Available: {formatBytes(storageData.available)}
                </Typography>
              </Box>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                startIcon={<StorageIcon />}
                onClick={() => navigate('/settings')}
              >
                Manage Storage
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* System Status */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  CPU Usage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemStatus.cpuUsage} 
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">
                      {`${Math.round(systemStatus.cpuUsage)}%`}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Memory Usage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={systemStatus.memoryUsage} 
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">
                      {`${Math.round(systemStatus.memoryUsage)}%`}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                System Uptime: {systemStatus.uptime}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Backups */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Backups
              </Typography>
              {recentBackups.length > 0 ? (
                <List dense sx={{ maxHeight: 208, overflow: 'auto' }}>
                  {recentBackups.map((backup, index) => (
                    <ListItem key={index} divider={index < recentBackups.length - 1}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">
                              {new Date(backup.date).toLocaleString()}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color={backup.status === 'Success' ? 'success.main' : 'warning.main'}
                            >
                              {backup.status}
                            </Typography>
                          </Box>
                        }
                        secondary={`Size: ${backup.size}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No recent backups found
                </Typography>
              )}
            </CardContent>
            <CardActions>
              <Button 
                size="small"
                onClick={() => navigate('/backup')}
              >
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Backup Profiles */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Backup Profiles
              </Typography>
              <Button 
                variant="contained" 
                size="small" 
                startIcon={<AddIcon />}
                onClick={handleCreateProfile}
              >
                Create Profile
              </Button>
            </Box>
            
            {profiles.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No backup profiles found. Create a profile to get started.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {profiles.map((profile) => (
                  <Grid item xs={12} md={6} lg={4} key={profile.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {profile.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Source: {profile.sourcePath}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Destination: {profile.destinationPath}
                        </Typography>
                        <Box>
                          {profile.scheduleEnabled && (
                            <Typography variant="body2" color="text.secondary">
                              Schedule: {profile.scheduleFrequency} at {profile.scheduleTime}
                            </Typography>
                          )}
                          {profile.encryptionEnabled && (
                            <Typography variant="body2" color="text.secondary">
                              Encryption: Enabled
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between' }}>
                        <Box>
                          <Tooltip title="Edit Profile">
                            <IconButton 
                              color="primary"
                              onClick={() => handleEditProfile(profile.id)}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Run Backup">
                            <IconButton 
                              color="success"
                              onClick={() => handleRunBackup(profile.id)}
                              size="small"
                            >
                              <PlayArrowIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Button 
                          size="small"
                          onClick={() => navigate(`/restore?profile=${profile.id}`)}
                        >
                          Restore
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage; 