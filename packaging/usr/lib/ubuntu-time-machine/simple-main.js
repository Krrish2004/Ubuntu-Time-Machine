const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

console.log('\n\n==========================================');
console.log('==== Ubuntu Time Machine Starting ======');
console.log('==========================================\n');

let mainWindow;

// Path to core binary - this is a simplified version for development
const coreExecutablePath = path.join(__dirname, '..', '..', 'core', 'build', 'bin', 'utm-core');
console.log(`[Main] Core executable path: ${coreExecutablePath}`);

// Create a mock core if it doesn't exist
function ensureMockCore() {
  const coreDir = path.dirname(coreExecutablePath);
  
  if (!fs.existsSync(coreDir)) {
    console.log(`[Main] Creating mock core directory: ${coreDir}`);
    fs.mkdirSync(coreDir, { recursive: true });
  }
  
  if (!fs.existsSync(coreExecutablePath)) {
    console.log(`[Main] Creating mock core executable: ${coreExecutablePath}`);
    
    // Create a simple shell script that responds to commands
    const scriptContent = `#!/bin/bash
echo "UTM Core Mock"
echo "Command: $@"

if [[ "$1" == "--list-profiles" ]]; then
  echo "- Default Profile"
  echo "- Home Backup"
  echo "- Documents"
fi

if [[ "$1" == "system-info" ]]; then
  echo '{"storage":{"total":1000000000,"used":450000000,"available":550000000},"cpu":{"usage":15},"memory":{"usagePercent":35},"uptime":"5 days, 7 hours"}'
fi

exit 0
`;
    
    fs.writeFileSync(coreExecutablePath, scriptContent);
    fs.chmodSync(coreExecutablePath, '755'); // Make it executable
    console.log(`[Main] Mock core executable created`);
  }
}

function createWindow() {
  console.log('[Main] Creating main window');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const htmlPath = path.join(__dirname, 'index.html');
  console.log(`[Main] Loading HTML from: ${htmlPath}`);
  mainWindow.loadFile(htmlPath);
  
  console.log('[Main] Opening DevTools');
  mainWindow.webContents.openDevTools();

  mainWindow.on('ready-to-show', () => {
    console.log('[Main] Window ready to show');
    mainWindow.show();
  });

  mainWindow.on('closed', function() {
    console.log('[Main] Window closed');
    mainWindow = null;
  });
  
  console.log('[Main] Window created successfully');
}

// Setup all required IPC handlers
function setupIpcHandlers() {
  console.log('[Main] Setting up IPC handlers');

  // Execute core command
  ipcMain.handle('execute-core-command', async (event, args) => {
    console.log(`[Main] Executing core command with args: ${args.join(' ')}`);
    
    return new Promise((resolve, reject) => {
      console.log(`[Main] Spawning process: ${coreExecutablePath} ${args.join(' ')}`);
      
      const command = spawn(coreExecutablePath, args);
      
      let stdout = '';
      let stderr = '';
      
      command.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[Main] Core stdout: ${chunk.trim()}`);
        mainWindow.webContents.send('core-command-output', chunk);
      });
      
      command.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[Main] Core stderr: ${chunk.trim()}`);
        mainWindow.webContents.send('core-command-error', chunk);
      });
      
      command.on('close', (code) => {
        console.log(`[Main] Core command completed with code: ${code}`);
        if (code === 0) {
          console.log('[Main] Command successful');
          resolve({ success: true, stdout, stderr });
        } else {
          console.error(`[Main] Command failed with code ${code}`);
          reject({ success: false, code, stdout, stderr });
        }
      });
      
      command.on('error', (error) => {
        console.error(`[Main] Error executing core command: ${error.message}`);
        reject({ success: false, error: error.message });
      });
    });
  });

  // Get list of available backup profiles
  ipcMain.handle('get-backup-profiles', async () => {
    console.log('[Main] Getting backup profiles');
    
    return new Promise((resolve, reject) => {
      console.log(`[Main] Executing: ${coreExecutablePath} --list-profiles`);
      
      const command = spawn(coreExecutablePath, ['--list-profiles']);
      
      let stdout = '';
      let stderr = '';
      
      command.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[Main] Profile list stdout: ${chunk.trim()}`);
      });
      
      command.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[Main] Profile list stderr: ${chunk.trim()}`);
      });
      
      command.on('close', (code) => {
        console.log(`[Main] Profile list command completed with code: ${code}`);
        if (code === 0) {
          const lines = stdout.split('\n').filter(line => line.trim().startsWith('-'));
          const profileNames = lines.map(line => line.trim().substring(2).trim());
          
          // Create profile objects from names
          const profiles = profileNames.map((name, index) => ({
            id: `profile-${index + 1}`,
            name: name,
            sourcePath: `/home/user/${name.toLowerCase().replace(/\s+/g, '-')}`,
            destinationPath: `/mnt/backup/${name.toLowerCase().replace(/\s+/g, '-')}`,
            excludePaths: ['/home/user/tmp', '/home/user/Downloads/temp'],
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
          }));
          
          console.log(`[Main] Found ${profiles.length} profiles`);
          resolve(profiles);
        } else {
          console.error(`[Main] Profile list failed with code ${code}: ${stderr}`);
          reject({ code, stderr });
        }
      });
      
      command.on('error', (error) => {
        console.error(`[Main] Error listing profiles: ${error.message}`);
        reject(error);
      });
    });
  });

  // Open external URL
  ipcMain.handle('open-external-url', async (event, url) => {
    console.log(`[Main] Opening external URL: ${url}`);
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error(`[Main] Failed to open URL: ${error.message}`);
      return false;
    }
  });

  // Show open directory dialog
  ipcMain.handle('show-open-directory-dialog', async () => {
    console.log('[Main] Showing directory selection dialog');
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      console.log(`[Main] Directory selection result: ${result.canceled ? 'canceled' : result.filePaths.join(', ')}`);
      return result.filePaths;
    } catch (error) {
      console.error(`[Main] Failed to show directory dialog: ${error.message}`);
      return [];
    }
  });
  
  console.log('[Main] IPC handlers setup complete');
}

app.on('ready', () => {
  console.log('[Main] App ready event triggered');
  
  // Ensure the mock core exists for development
  ensureMockCore();
  
  // Setup IPC handlers before creating the window
  setupIpcHandlers();
  
  // Create the main window
  createWindow();
});

app.on('window-all-closed', function() {
  console.log('[Main] All windows closed');
  if (process.platform !== 'darwin') {
    console.log('[Main] Quitting application');
    app.quit();
  }
});

app.on('activate', function() {
  console.log('[Main] App activated');
  if (mainWindow === null) {
    console.log('[Main] No windows found, creating main window');
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('[Main] Initialization complete');
