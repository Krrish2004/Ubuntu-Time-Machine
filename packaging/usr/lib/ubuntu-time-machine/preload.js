const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Script initializing');

// Define the API exposed to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Core operations
  executeCore: (args) => {
    console.log('[Preload] Executing core command with args:', args);
    return ipcRenderer.invoke('execute-core-command', args);
  },
  getBackupProfiles: () => {
    console.log('[Preload] Getting backup profiles');
    return ipcRenderer.invoke('get-backup-profiles');
  },
  
  // File system operations
  selectDirectory: () => {
    console.log('[Preload] Opening directory selection dialog');
    return ipcRenderer.invoke('show-open-directory-dialog');
  },
  
  // External operations
  openExternalUrl: (url) => {
    console.log('[Preload] Opening external URL:', url);
    return ipcRenderer.invoke('open-external-url', url);
  },
  
  // Updates
  checkForUpdates: () => {
    console.log('[Preload] Checking for updates');
    ipcRenderer.send('check-for-updates');
  },
  
  // Event listeners
  onUpdateStatus: (callback) => {
    console.log('[Preload] Registering update status listener');
    const listener = (_event, status, data) => {
      console.log(`[Preload] Update status: ${status}`, data);
      callback(status, data);
    };
    ipcRenderer.on('update-status', listener);
    return () => {
      console.log('[Preload] Removing update status listener');
      ipcRenderer.removeListener('update-status', listener);
    };
  },
  
  onCoreCommandOutput: (callback) => {
    console.log('[Preload] Registering core command output listener');
    const listener = (_event, output) => {
      console.log(`[Preload] Core command output received`);
      callback(output);
    };
    ipcRenderer.on('core-command-output', listener);
    return () => {
      console.log('[Preload] Removing core command output listener');
      ipcRenderer.removeListener('core-command-output', listener);
    };
  },
  
  onCoreCommandError: (callback) => {
    console.log('[Preload] Registering core command error listener');
    const listener = (_event, error) => {
      console.log('[Preload] Core command error:', error);
      callback(error);
    };
    ipcRenderer.on('core-command-error', listener);
    return () => {
      console.log('[Preload] Removing core command error listener');
      ipcRenderer.removeListener('core-command-error', listener);
    };
  },
  
  onTriggerBackup: (callback) => {
    console.log('[Preload] Registering trigger backup listener');
    const listener = () => {
      console.log('[Preload] Backup triggered from main process');
      callback();
    };
    ipcRenderer.on('trigger-backup', listener);
    return () => {
      console.log('[Preload] Removing trigger backup listener');
      ipcRenderer.removeListener('trigger-backup', listener);
    };
  },
  
  // System information
  version: process.versions.electron,
  platform: process.platform,
  arch: process.arch
});

console.log('[Preload] API exposed to renderer process'); 