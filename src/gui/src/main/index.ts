import { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import * as electronLog from 'electron-log';

// Configure logging
electronLog.transports.console.level = 'debug';
electronLog.transports.file.level = 'debug';
electronLog.info('Application starting');

// Store windows globally to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Path to core binary
const isDevelopment = process.env.NODE_ENV !== 'production';
const coreExecutablePath = isDevelopment
  ? path.join(process.cwd(), '../core/build/bin/utm-core')
  : path.join(process.resourcesPath, 'bin/utm-core');

electronLog.info(`Core executable path: ${coreExecutablePath}`);
electronLog.info(`Development mode: ${isDevelopment}`);

/**
 * Create the main application window
 */
function createMainWindow() {
  electronLog.info('Creating main window');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  const htmlPath = path.join(__dirname, '../index.html');
  electronLog.info(`Loading HTML from: ${htmlPath}`);

  // Load main window content
  if (isDevelopment) {
    mainWindow.loadFile(htmlPath);
    electronLog.info('Opening DevTools in development mode');
    // Open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(htmlPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    electronLog.info('Main window ready to show');
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Handle window close event
  mainWindow.on('close', (event) => {
    electronLog.debug('Window close event triggered');
    if (!isQuitting) {
      electronLog.info('Hiding window instead of closing');
      event.preventDefault();
      if (mainWindow) {
        mainWindow.hide();
      }
      return false;
    }
    electronLog.info('Window closing');
    return true;
  });

  // Clean up on closed
  mainWindow.on('closed', () => {
    electronLog.info('Main window closed');
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Create the system tray icon
 */
function createTray() {
  electronLog.info('Creating system tray');
  // For development, use a simple approach
  let iconPath = path.join(__dirname, '..', 'assets', 'icons', '16x16.png');
  electronLog.debug(`Looking for icon at: ${iconPath}`);
  
  // Fallback to a system icon if our custom icon is not found
  if (!fs.existsSync(iconPath)) {
    const alternateIconPath = path.join(__dirname, 'assets', 'icons', '16x16.png');
    electronLog.debug(`Primary icon not found, trying alternate path: ${alternateIconPath}`);
    iconPath = alternateIconPath;
    
    // Create a directory for the icon if it doesn't exist
    if (!fs.existsSync(path.dirname(iconPath))) {
      electronLog.debug('Creating icon directory');
      fs.mkdirSync(path.dirname(iconPath), { recursive: true });
      // Touch the file to create it if it doesn't exist
      fs.writeFileSync(iconPath, '');
      electronLog.debug('Created empty icon file as fallback');
    }
  }
  
  electronLog.info(`Using icon from: ${iconPath}`);
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Ubuntu Time Machine', click: () => { 
      electronLog.info('Tray: Show application clicked');
      if (mainWindow) mainWindow.show(); 
    }},
    { type: 'separator' },
    { label: 'Perform Backup Now', click: () => { 
      electronLog.info('Tray: Perform Backup clicked');
      sendToRenderer('trigger-backup'); 
    }},
    { label: 'Check for Updates', click: () => {
      electronLog.info('Tray: Check for Updates clicked');
      checkForUpdates();
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => { 
      electronLog.info('Tray: Quit clicked');
      isQuitting = true; 
      app.quit(); 
    }},
  ]);

  tray.setToolTip('Ubuntu Time Machine');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    electronLog.debug('Tray icon clicked');
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        electronLog.info('Hiding main window from tray click');
        mainWindow.hide();
      } else {
        electronLog.info('Showing main window from tray click');
        mainWindow.show();
      }
    }
  });

  return tray;
}

/**
 * Send a message to the renderer process
 */
function sendToRenderer(channel: string, ...args: any[]) {
  electronLog.debug(`Sending to renderer: ${channel}`, args);
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, ...args);
  } else {
    electronLog.warn(`Failed to send to renderer: ${channel} (window not available)`);
  }
}

/**
 * Check for application updates
 */
function checkForUpdates() {
  electronLog.info('Checking for updates');
  // Implementation of checkForUpdates function
}

// Application initialization
app.whenReady().then(() => {
  electronLog.info('Electron app ready');
  createMainWindow();
  createTray();

  // Check if core binary exists
  electronLog.debug(`Checking if core exists at: ${coreExecutablePath}`);
  if (!fs.existsSync(coreExecutablePath)) {
    electronLog.error(`Core binary not found at: ${coreExecutablePath}`);
    dialog.showErrorBox(
      'Core Component Missing',
      `The core backup component was not found at: ${coreExecutablePath}`
    );
    app.quit();
    return;
  }
  electronLog.info('Core binary verified');

  // Set up IPC handlers
  setupIpcHandlers();

  // Check for updates on startup
  if (!isDevelopment) {
    electronLog.info('Scheduling update check');
    setTimeout(checkForUpdates, 3000);
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  electronLog.warn('Another instance is already running. Quitting this instance.');
  app.quit();
} else {
  electronLog.info('Got single instance lock');
  app.on('second-instance', () => {
    electronLog.info('Second instance detected, focusing main window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// MacOS specific behavior
app.on('activate', () => {
  electronLog.debug('Activate event triggered');
  if (BrowserWindow.getAllWindows().length === 0) {
    electronLog.info('No windows found, creating main window');
    createMainWindow();
  }
});

// Prepare to quit
app.on('before-quit', () => {
  electronLog.info('Application is preparing to quit');
  isQuitting = true;
});

// Clean up
app.on('quit', () => {
  electronLog.info('Application is quitting');
  tray = null;
});

// Set up IPC handlers for renderer communication
function setupIpcHandlers() {
  electronLog.info('Setting up IPC handlers');

  // Execute core command
  ipcMain.handle('execute-core-command', async (event, args: string[]) => {
    electronLog.info(`Executing core command with args: ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
      electronLog.debug(`Spawning process: ${coreExecutablePath} ${args.join(' ')}`);
      const command = childProcess.spawn(coreExecutablePath, args);
      
      let stdout = '';
      let stderr = '';
      
      command.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        electronLog.debug(`Core stdout: ${chunk.trim()}`);
        sendToRenderer('core-command-output', chunk);
      });
      
      command.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        electronLog.warn(`Core stderr: ${chunk.trim()}`);
        sendToRenderer('core-command-error', chunk);
      });
      
      command.on('close', (code) => {
        electronLog.info(`Core command completed with code: ${code}`);
        if (code === 0) {
          electronLog.debug('Command successful');
          resolve({ success: true, stdout, stderr });
        } else {
          electronLog.error(`Command failed with code ${code}`);
          reject({ success: false, code, stdout, stderr });
        }
      });
      
      command.on('error', (error) => {
        electronLog.error(`Error executing core command: ${error.message}`);
        reject({ success: false, error: error.message });
      });
    });
  });

  // Get list of available backup profiles
  ipcMain.handle('get-backup-profiles', async () => {
    electronLog.info('Getting backup profiles');
    return new Promise((resolve, reject) => {
      electronLog.debug(`Executing: ${coreExecutablePath} --list-profiles`);
      const command = childProcess.spawn(coreExecutablePath, ['--list-profiles']);
      
      let stdout = '';
      let stderr = '';
      
      command.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        electronLog.debug(`Profile list stdout: ${chunk.trim()}`);
      });
      
      command.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        electronLog.warn(`Profile list stderr: ${chunk.trim()}`);
      });
      
      command.on('close', (code) => {
        electronLog.info(`Profile list command completed with code: ${code}`);
        if (code === 0) {
          const lines = stdout.split('\n').filter(line => line.trim().startsWith('-'));
          const profiles = lines.map(line => line.trim().substring(2).trim());
          electronLog.info(`Found ${profiles.length} profiles`);
          electronLog.debug(`Profiles: ${JSON.stringify(profiles)}`);
          resolve(profiles);
        } else {
          electronLog.error(`Profile list failed with code ${code}: ${stderr}`);
          reject({ code, stderr });
        }
      });
      
      command.on('error', (error) => {
        electronLog.error(`Error listing profiles: ${error.message}`);
        reject(error);
      });
    });
  });

  // Open external URL
  ipcMain.handle('open-external-url', async (event, url: string) => {
    electronLog.info(`Opening external URL: ${url}`);
    return shell.openExternal(url);
  });

  // Show open directory dialog
  ipcMain.handle('show-open-directory-dialog', async () => {
    electronLog.info('Showing directory selection dialog');
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    electronLog.info(`Directory selection result: ${result.canceled ? 'canceled' : result.filePaths.join(', ')}`);
    return result.filePaths;
  });
  
  electronLog.info('IPC handlers setup complete');
} 