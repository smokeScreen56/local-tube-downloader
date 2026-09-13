import { contextBridge, ipcRenderer } from 'electron';
import {
  DownloadRequest,
  DownloadProgress,
  DownloadTask,
  AppSettings,
  DependencyStatus,
  VideoMetadata,
  HistoryItem,
} from '../shared/types';

const api = {
  // Dependencies
  checkDependencies: (): Promise<DependencyStatus> => ipcRenderer.invoke('deps:check'),
  updateYtDlp: (): Promise<{ success: boolean; message: string; version?: string }> =>
    ipcRenderer.invoke('deps:updateYtDlp'),

  // Video Analysis & Download
  analyzeVideo: (url: string, browserOverride?: any): Promise<any> =>
    ipcRenderer.invoke('video:analyze', url, browserOverride),
  startDownload: (request: DownloadRequest): Promise<{ downloadId: string }> =>
    ipcRenderer.invoke('download:start', request),
  cancelDownload: (downloadId: string): Promise<boolean> =>
    ipcRenderer.invoke('download:cancel', downloadId),

  // File & Folder dialogs / Shell
  selectFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFolder', defaultPath),
  selectFile: (title: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFile', title, filters),
  openFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('shell:openFile', filePath),
  openFolder: (filePath: string): Promise<boolean> => ipcRenderer.invoke('shell:openFolder', filePath),

  // Settings & History
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', settings),
  getHistory: (): Promise<HistoryItem[]> => ipcRenderer.invoke('history:get'),
  clearHistory: (): Promise<boolean> => ipcRenderer.invoke('history:clear'),
  deleteHistoryItem: (id: string): Promise<boolean> => ipcRenderer.invoke('history:delete', id),

  // Real-time Event Listeners
  onDownloadProgress: (callback: (progress: DownloadProgress) => void): (() => void) => {
    const handler = (_: any, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on('download:progress', handler);
    return () => {
      ipcRenderer.removeListener('download:progress', handler);
    };
  },
  onDownloadCompleted: (callback: (task: DownloadTask) => void): (() => void) => {
    const handler = (_: any, task: DownloadTask) => callback(task);
    ipcRenderer.on('download:completed', handler);
    return () => {
      ipcRenderer.removeListener('download:completed', handler);
    };
  },
  onDownloadError: (callback: (error: { downloadId: string; error: string }) => void): (() => void) => {
    const handler = (_: any, error: { downloadId: string; error: string }) => callback(error);
    ipcRenderer.on('download:error', handler);
    return () => {
      ipcRenderer.removeListener('download:error', handler);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);
