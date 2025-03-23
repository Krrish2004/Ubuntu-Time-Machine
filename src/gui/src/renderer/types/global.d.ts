interface ElectronAPI {
  executeCore: (command: string, args: string[]) => Promise<{ success: boolean; output: string; error?: string }>;
  getBackupProfiles: () => Promise<any[]>;
  selectDirectory: () => Promise<string | null>;
  openExternalUrl: (url: string) => Promise<void>;
  onBackupComplete: (callback: (event: any, status: any) => void) => void;
  onBackupProgress: (callback: (event: any, progress: any) => void) => void;
  onUpdateAvailable: (callback: (event: any, info: any) => void) => void;
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => void;
  onCommandOutput: (callback: (event: any, data: any) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
} 