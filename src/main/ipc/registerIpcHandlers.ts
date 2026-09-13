import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { dependencyService } from '../services/dependencyService';
import { ytDlpService } from '../services/ytDlpService';
import { downloadService } from '../services/downloadService';
import { storageService } from '../services/storageService';
import { DownloadRequest, AppSettings } from '../../shared/types';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  downloadService.setMainWindow(mainWindow);

  // 1. Dependency Management
  ipcMain.handle('deps:check', async () => {
    return await dependencyService.checkAllDependencies();
  });

  ipcMain.handle('deps:updateYtDlp', async () => {
    return await ytDlpService.updateYtDlp();
  });

  // 2. Video Analysis
  ipcMain.handle('video:analyze', async (_, rawUrl: string, browserOverride?: any) => {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return {
        status: 'FAILED',
        message: 'Please provide a valid video URL.',
      };
    }
    return await ytDlpService.getVideoInfo(rawUrl, browserOverride);
  });

  // 3. Downloads
  ipcMain.handle('download:start', async (_, request: DownloadRequest) => {
    if (!request || !request.url) {
      throw new Error('Invalid download request.');
    }
    return await downloadService.startDownload(request);
  });

  ipcMain.handle('download:cancel', async (_, downloadId: string) => {
    if (!downloadId) return false;
    return downloadService.cancelDownload(downloadId);
  });

  // 4. File & Folder Dialogs
  ipcMain.handle('dialog:selectFolder', async (_, defaultPath?: string) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Download Folder',
      defaultPath: defaultPath || storageService.getSettings().defaultDownloadPath,
      properties: ['openDirectory', 'createDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('dialog:selectFile', async (_, title: string, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Select Executable File',
      properties: ['openFile'],
      filters: filters || [
        { name: 'Executables', extensions: ['exe', 'bat', 'cmd', 'bin', ''] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // 5. Open File & Folder
  ipcMain.handle('shell:openFile', async (_, filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return false;
    }
    const res = await shell.openPath(filePath);
    return res === ''; // empty string means success
  });

  ipcMain.handle('shell:openFolder', async (_, filePath: string) => {
    if (!filePath) return false;
    let target = filePath;

    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        shell.showItemInFolder(filePath);
        return true;
      }
      target = filePath;
    } else {
      target = path.dirname(filePath);
    }

    if (fs.existsSync(target)) {
      await shell.openPath(target);
      return true;
    }
    return false;
  });

  // 6. Settings & History
  ipcMain.handle('settings:get', async () => {
    return storageService.getSettings();
  });

  ipcMain.handle('settings:save', async (_, newSettings: Partial<AppSettings>) => {
    return storageService.saveSettings(newSettings);
  });

  ipcMain.handle('history:get', async () => {
    return storageService.getHistory();
  });

  ipcMain.handle('history:clear', async () => {
    return storageService.clearHistory();
  });

  ipcMain.handle('history:delete', async (_, id: string) => {
    return storageService.deleteHistoryItem(id);
  });
}
