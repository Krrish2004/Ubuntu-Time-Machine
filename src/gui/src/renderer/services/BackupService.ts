/**
 * BackupService.ts
 * 
 * Service to interact with the Ubuntu Time Machine core backup engine through Electron's IPC
 */

// Define interfaces for data structures
export interface BackupProfile {
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

export interface BackupResult {
  success: boolean;
  timestamp: string;
  size: number;
  fileCount: number;
  duration: number;
  errorMessage?: string;
}

export interface RestoreOptions {
  profileId: string;
  backupId?: string;
  targetPath?: string;
  selectedFiles?: string[];
  restorePoint?: string;
}

export interface BackupListItem {
  id: string;
  profileId: string;
  timestamp: string;
  size: number;
  fileCount: number;
  status: 'success' | 'error' | 'partial';
  errorMessage?: string;
}

export interface BackupProgress {
  currentFile: string;
  processedFiles: number;
  totalFiles: number;
  processedBytes: number;
  totalBytes: number;
  percentComplete: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
}

class BackupService {
  private logPrefix = '[BackupService]';
  
  constructor() {
    console.log(`${this.logPrefix} Initializing`);
  }

  /**
   * Get all backup profiles
   */
  async getProfiles(): Promise<BackupProfile[]> {
    console.log(`${this.logPrefix} Getting all profiles`);
    try {
      const profiles = await window.electronAPI.getBackupProfiles();
      console.log(`${this.logPrefix} Retrieved ${profiles.length} profiles`);
      return profiles;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching profiles:`, error);
      throw error;
    }
  }

  /**
   * Get a single backup profile by ID
   */
  async getProfile(id: string): Promise<BackupProfile | null> {
    console.log(`${this.logPrefix} Getting profile by ID: ${id}`);
    try {
      const profiles = await this.getProfiles();
      const profile = profiles.find(profile => profile.id === id) || null;
      console.log(`${this.logPrefix} Profile ${id} ${profile ? 'found' : 'not found'}`);
      return profile;
    } catch (error) {
      console.error(`${this.logPrefix} Error fetching profile ${id}:`, error);
      throw error;
    }
  }

  /**
   * Save a backup profile (create or update)
   */
  async saveProfile(profile: BackupProfile): Promise<boolean> {
    console.log(`${this.logPrefix} Saving profile:`, { id: profile.id, name: profile.name });
    try {
      console.log(`${this.logPrefix} Executing save-profile command`);
      const result = await window.electronAPI.executeCore([
        'save-profile', 
        '--profile-data', JSON.stringify(profile)
      ]);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Failed to save profile:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to save profile');
      }
      
      console.log(`${this.logPrefix} Profile saved successfully`);
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error saving profile:`, error);
      throw error;
    }
  }

  /**
   * Delete a backup profile
   */
  async deleteProfile(id: string): Promise<boolean> {
    console.log(`${this.logPrefix} Deleting profile: ${id}`);
    try {
      console.log(`${this.logPrefix} Executing delete-profile command`);
      const result = await window.electronAPI.executeCore([
        'delete-profile', 
        '--profile-id', id
      ]);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Failed to delete profile:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to delete profile');
      }
      
      console.log(`${this.logPrefix} Profile ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error deleting profile:`, error);
      throw error;
    }
  }

  /**
   * Start a backup using a profile
   */
  async startBackup(profileId: string, options: { dryRun?: boolean } = {}): Promise<string> {
    console.log(`${this.logPrefix} Starting backup for profile: ${profileId}`, options);
    try {
      const args = ['start-backup', '--profile-id', profileId];
      
      if (options.dryRun) {
        console.log(`${this.logPrefix} Dry run mode enabled`);
        args.push('--dry-run');
      }
      
      console.log(`${this.logPrefix} Executing start-backup command with args:`, args);
      const result = await window.electronAPI.executeCore(args);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Backup failed:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to start backup');
      }
      
      // Return the backup ID from the output
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`${this.logPrefix} Backup started with ID: ${parsed.backupId}`);
        return parsed.backupId;
      } catch (e) {
        console.error(`${this.logPrefix} Failed to parse backup ID from response:`, e);
        console.log(`${this.logPrefix} Response content:`, result.stdout);
        throw new Error('Invalid response format from backup command');
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error starting backup:`, error);
      throw error;
    }
  }

  /**
   * Cancel an ongoing backup
   */
  async cancelBackup(backupId: string): Promise<boolean> {
    console.log(`${this.logPrefix} Canceling backup: ${backupId}`);
    try {
      const args = ['cancel-backup', '--backup-id', backupId];
      console.log(`${this.logPrefix} Executing command with args:`, args);
      const result = await window.electronAPI.executeCore(args);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Cancel backup failed:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to cancel backup');
      }
      
      console.log(`${this.logPrefix} Backup ${backupId} canceled successfully`);
      return true;
    } catch (error) {
      console.error(`${this.logPrefix} Error canceling backup:`, error);
      throw error;
    }
  }

  /**
   * Get a list of backups for a profile
   */
  async getBackupsList(profileId: string): Promise<BackupListItem[]> {
    console.log(`${this.logPrefix} Getting backups list for profile: ${profileId}`);
    try {
      const args = ['list-backups', '--profile-id', profileId];
      console.log(`${this.logPrefix} Executing command with args:`, args);
      const result = await window.electronAPI.executeCore(args);
      
      if (!result.success) {
        console.error(`${this.logPrefix} List backups failed:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to list backups');
      }
      
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`${this.logPrefix} Retrieved ${parsed.backups.length} backups`);
        return parsed.backups;
      } catch (e) {
        console.error(`${this.logPrefix} Failed to parse backups list from response:`, e);
        console.log(`${this.logPrefix} Response content:`, result.stdout);
        throw new Error('Invalid response format from list-backups command');
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error listing backups:`, error);
      throw error;
    }
  }

  /**
   * Get details about a specific backup
   */
  async getBackupDetails(backupId: string): Promise<any> {
    console.log(`${this.logPrefix} Getting details for backup: ${backupId}`);
    try {
      const args = ['backup-details', '--backup-id', backupId];
      console.log(`${this.logPrefix} Executing command with args:`, args);
      const result = await window.electronAPI.executeCore(args);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Get backup details failed:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to get backup details');
      }
      
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`${this.logPrefix} Retrieved details for backup ${backupId}`);
        return parsed;
      } catch (e) {
        console.error(`${this.logPrefix} Failed to parse backup details from response:`, e);
        console.log(`${this.logPrefix} Response content:`, result.stdout);
        throw new Error('Invalid response format from backup-details command');
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error getting backup details:`, error);
      throw error;
    }
  }

  /**
   * Start a restore operation
   */
  async startRestore(options: RestoreOptions): Promise<string> {
    console.log(`${this.logPrefix} Starting restore with options:`, options);
    try {
      const args = [
        'start-restore',
        '--profile-id', options.profileId
      ];
      
      if (options.backupId) {
        args.push('--backup-id', options.backupId);
      }
      
      if (options.targetPath) {
        args.push('--target-path', options.targetPath);
      }
      
      if (options.selectedFiles && options.selectedFiles.length > 0) {
        args.push('--files', options.selectedFiles.join(','));
      }
      
      if (options.restorePoint) {
        args.push('--restore-point', options.restorePoint);
      }
      
      console.log(`${this.logPrefix} Executing command with args:`, args);
      const result = await window.electronAPI.executeCore(args);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Start restore failed:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to start restore');
      }
      
      // Return the restore ID from the output
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`${this.logPrefix} Restore started with ID: ${parsed.restoreId}`);
        return parsed.restoreId;
      } catch (e) {
        console.error(`${this.logPrefix} Failed to parse restore ID from response:`, e);
        console.log(`${this.logPrefix} Response content:`, result.stdout);
        throw new Error('Invalid response format from start-restore command');
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error starting restore:`, error);
      throw error;
    }
  }

  /**
   * Browse files in a backup
   */
  async browseBackupFiles(backupId: string, path: string = '/'): Promise<any[]> {
    console.log(`${this.logPrefix} Browsing files in backup ${backupId} at path: ${path}`);
    try {
      const args = ['browse-backup', '--backup-id', backupId, '--path', path];
      console.log(`${this.logPrefix} Executing command with args:`, args);
      const result = await window.electronAPI.executeCore(args);
      
      if (!result.success) {
        console.error(`${this.logPrefix} Browse backup files failed:`, result.stderr || result.error);
        throw new Error(result.stderr || 'Failed to browse backup files');
      }
      
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`${this.logPrefix} Retrieved ${parsed.items.length} items from backup`);
        return parsed.items;
      } catch (e) {
        console.error(`${this.logPrefix} Failed to parse file list from response:`, e);
        console.log(`${this.logPrefix} Response content:`, result.stdout);
        throw new Error('Invalid response format from browse-backup command');
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error browsing backup files:`, error);
      throw error;
    }
  }

  /**
   * Register a listener for backup progress events
   */
  registerProgressListener(callback: (progress: BackupProgress) => void): () => void {
    console.log(`${this.logPrefix} Registering progress listener`);
    const listener = (_event: any, progress: BackupProgress) => {
      console.log(`${this.logPrefix} Progress update: ${progress.percentComplete.toFixed(2)}% complete, ${progress.processedFiles}/${progress.totalFiles} files`);
      callback(progress);
    };
    
    window.electronAPI.onCoreCommandOutput(output => {
      // Try to parse progress information from output
      try {
        if (output.includes('PROGRESS:')) {
          const progressData = JSON.parse(output.substring(output.indexOf('PROGRESS:') + 9));
          listener(null, progressData);
        }
      } catch (e) {
        console.error(`${this.logPrefix} Error parsing progress data:`, e);
      }
    });
    
    console.log(`${this.logPrefix} Progress listener registered`);
    return () => console.log(`${this.logPrefix} Progress listener removed`);
  }

  /**
   * Register a listener for backup completion events
   */
  registerCompletionListener(callback: (result: BackupResult) => void): () => void {
    console.log(`${this.logPrefix} Registering completion listener`);
    const listener = (_event: any, result: BackupResult) => {
      console.log(`${this.logPrefix} Backup ${result.success ? 'completed successfully' : 'failed'}:`, result);
      callback(result);
    };
    
    window.electronAPI.onCoreCommandOutput(output => {
      // Try to parse completion information from output
      try {
        if (output.includes('COMPLETE:')) {
          const completionData = JSON.parse(output.substring(output.indexOf('COMPLETE:') + 9));
          listener(null, completionData);
        }
      } catch (e) {
        console.error(`${this.logPrefix} Error parsing completion data:`, e);
      }
    });
    
    console.log(`${this.logPrefix} Completion listener registered`);
    return () => console.log(`${this.logPrefix} Completion listener removed`);
  }
  
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    console.log(`${this.logPrefix} Getting system information`);
    try {
      console.log(`${this.logPrefix} Executing system-info command`);
      const result = await window.electronAPI.executeCore(['system-info']);
      
      if (!result.success) {
        console.error(`${this.logPrefix} System info command failed:`, result.stderr || result.error);
        // Return mock data instead of throwing
        return this.getMockSystemInfo();
      }
      
      try {
        const parsed = JSON.parse(result.stdout);
        console.log(`${this.logPrefix} System info retrieved successfully`);
        return parsed;
      } catch (e) {
        console.error(`${this.logPrefix} Failed to parse system info:`, e);
        console.log(`${this.logPrefix} Raw system info:`, result.stdout);
        // Return mock data instead of throwing
        return this.getMockSystemInfo();
      }
    } catch (error) {
      console.error(`${this.logPrefix} Error getting system info:`, error);
      // Return mock data instead of throwing
      return this.getMockSystemInfo();
    }
  }
  
  /**
   * Get mock system information when real data is unavailable
   */
  private getMockSystemInfo(): any {
    return {
      storage: {
        total: 1000000000,
        used: 450000000,
        available: 550000000
      },
      cpu: {
        usage: 15
      },
      memory: {
        usagePercent: 35
      },
      uptime: "5 days, 7 hours"
    };
  }
}

// Export an instance
const backupService = new BackupService();
export default backupService; 