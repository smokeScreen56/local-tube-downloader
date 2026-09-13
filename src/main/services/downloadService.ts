import { BrowserWindow } from 'electron';
import { DownloadRequest, DownloadTask, DownloadProgress, HistoryItem } from '../../shared/types';
import { ytDlpService } from './ytDlpService';
import { storageService } from './storageService';

export class DownloadService {
  private tasks: Map<string, DownloadTask> = new Map();
  private mainWindow: BrowserWindow | null = null;

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  public async startDownload(request: DownloadRequest, videoTitle?: string, thumbnail?: string): Promise<{ downloadId: string }> {
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const task: DownloadTask = {
      id: downloadId,
      url: request.url,
      title: videoTitle || 'Downloading Video',
      thumbnail: thumbnail || '',
      duration: 0,
      quality: request.quality,
      container: request.container,
      downloadPath: request.downloadPath || storageService.getSettings().defaultDownloadPath,
      status: 'queued',
      progress: 0,
      speed: 'Starting...',
      downloadedBytes: 0,
      totalBytes: 0,
      eta: '--:--',
      createdAt: Date.now(),
    };

    this.tasks.set(downloadId, task);

    // Run async download
    ytDlpService.startDownload(
      downloadId,
      request,
      (progress: DownloadProgress) => {
        const currentTask = this.tasks.get(downloadId);
        if (currentTask) {
          currentTask.status = progress.status;
          currentTask.progress = progress.progress;
          currentTask.speed = progress.speed;
          currentTask.eta = progress.eta;
          currentTask.statusText = progress.statusText;
        }

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('download:progress', progress);
        }
      },
      (outputPath: string) => {
        const currentTask = this.tasks.get(downloadId);
        if (currentTask) {
          currentTask.status = 'completed';
          currentTask.outputPath = outputPath;
          currentTask.completedAt = Date.now();
          currentTask.progress = 100;

          // Save to persistent history
          const historyItem: HistoryItem = {
            id: currentTask.id,
            title: currentTask.title,
            url: currentTask.url,
            thumbnail: currentTask.thumbnail,
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            resolution: currentTask.quality.toUpperCase(),
            container: currentTask.container.toUpperCase(),
            outputPath: outputPath,
            status: 'completed',
          };
          storageService.addHistoryItem(historyItem);

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('download:completed', currentTask);
          }
        }
      },
      (errorMsg: string) => {
        const currentTask = this.tasks.get(downloadId);
        if (currentTask) {
          currentTask.status = 'failed';
          currentTask.error = errorMsg;

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('download:error', {
              downloadId,
              error: errorMsg,
            });
          }
        }
      }
    );

    return { downloadId };
  }

  public cancelDownload(downloadId: string): boolean {
    const task = this.tasks.get(downloadId);
    if (task) {
      task.status = 'cancelled';
      const cancelled = ytDlpService.cancelDownload(downloadId);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('download:progress', {
          downloadId,
          status: 'cancelled',
          progress: task.progress,
          speed: 'Cancelled',
          downloadedBytes: 0,
          totalBytes: 0,
          eta: '--:--',
          statusText: 'Download cancelled by user.',
        });
      }
      return cancelled;
    }
    return false;
  }

  public getTask(downloadId: string): DownloadTask | undefined {
    return this.tasks.get(downloadId);
  }

  public getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }
}

export const downloadService = new DownloadService();
