import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Script initializing');

// Define the API exposed to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Core operations
  executeCore: (args: string[]) => {
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
  openExternalUrl: (url: string) => {
    console.log('[Preload] Opening external URL:', url);
    return ipcRenderer.invoke('open-external-url', url);
  },
  
  // Updates
  checkForUpdates: () => {
    console.log('[Preload] Checking for updates');
    ipcRenderer.send('check-for-updates');
  },
  
  // Event listeners
  onUpdateStatus: (callback: (status: string, data: any) => void) => {
    console.log('[Preload] Registering update status listener');
    const listener = (_event: any, status: string, data: any) => {
      console.log(`[Preload] Update status: ${status}`, data);
      callback(status, data);
    };
    ipcRenderer.on('update-status', listener);
    return () => {
      console.log('[Preload] Removing update status listener');
      ipcRenderer.removeListener('update-status', listener);
    };
  },
  
  onCoreCommandOutput: (callback: (output: string) => void) => {
    console.log('[Preload] Registering core command output listener');
    const listener = (_event: any, output: string) => {
      console.log(`[Preload] Core command output: ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
      callback(output);
    };
    ipcRenderer.on('core-command-output', listener);
    return () => {
      console.log('[Preload] Removing core command output listener');
      ipcRenderer.removeListener('core-command-output', listener);
    };
  },
  
  onCoreCommandError: (callback: (error: string) => void) => {
    console.log('[Preload] Registering core command error listener');
    const listener = (_event: any, error: string) => {
      console.log('[Preload] Core command error:', error);
      callback(error);
    };
    ipcRenderer.on('core-command-error', listener);
    return () => {
      console.log('[Preload] Removing core command error listener');
      ipcRenderer.removeListener('core-command-error', listener);
    };
  },
  
  onTriggerBackup: (callback: () => void) => {
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
  }
});

console.log('[Preload] API exposed to renderer process');

// Also provide type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      executeCore: (args: string[]) => Promise<{ success: boolean, stdout: string, stderr: string }>;
      getBackupProfiles: () => Promise<string[]>;
      selectDirectory: () => Promise<string[]>;
      openExternalUrl: (url: string) => Promise<void>;
      checkForUpdates: () => void;
      onUpdateStatus: (callback: (status: string, data: any) => void) => () => void;
      onCoreCommandOutput: (callback: (output: string) => void) => () => void;
      onCoreCommandError: (callback: (error: string) => void) => () => void;
      onTriggerBackup: (callback: () => void) => () => void;
    }
  }
}