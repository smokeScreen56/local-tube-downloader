import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { ytDlpService } from './services/ytDlpService';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getPreloadPath(): string {
  const candidates = [
    path.join(__dirname, '..', 'preload', 'preload.js'),
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'dist', 'preload', 'preload.js'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return path.join(__dirname, '..', 'preload', 'preload.js');
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'LocalTube Downloader',
    backgroundColor: '#0b0f19',
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  registerIpcHandlers(mainWindow);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  const localIndexPath = path.join(__dirname, '..', 'renderer', 'index.html');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.on('did-fail-load', () => {
      if (fs.existsSync(localIndexPath)) {
        mainWindow?.loadFile(localIndexPath);
      }
    });
  } else {
    if (fs.existsSync(localIndexPath)) {
      mainWindow.loadFile(localIndexPath);
    } else {
      mainWindow.loadURL(devServerUrl);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  ytDlpService.cleanupAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  ytDlpService.cleanupAll();
});
