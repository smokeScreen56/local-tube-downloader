import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { AppSettings, HistoryItem } from '../../shared/types';

const defaultSettings: AppSettings = {
  defaultDownloadPath: '',
  defaultQuality: '1080p',
  defaultContainer: 'mp4',
  defaultAudioQuality: 'best',
  browserForCookies: 'none',
  customYtDlpPath: '',
  customFfmpegPath: '',
  customFfprobePath: '',
  customYtDlpArgs: '',
  autoCheckUpdates: true,
  maxConcurrentDownloads: 3,
};

export class StorageService {
  private userDataPath: string;
  private settingsFile: string;
  private historyFile: string;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.settingsFile = path.join(this.userDataPath, 'settings.json');
    this.historyFile = path.join(this.userDataPath, 'history.json');
    this.initStorage();
  }

  private initStorage(): void {
    if (!fs.existsSync(this.userDataPath)) {
      fs.mkdirSync(this.userDataPath, { recursive: true });
    }

    if (!fs.existsSync(this.settingsFile)) {
      const defaultWithDownloads = {
        ...defaultSettings,
        defaultDownloadPath: app.getPath('downloads') || path.join(process.env.USERPROFILE || '', 'Downloads'),
      };
      this.saveSettings(defaultWithDownloads);
    }

    if (!fs.existsSync(this.historyFile)) {
      this.saveHistory([]);
    }
  }

  public getSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const raw = fs.readFileSync(this.settingsFile, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...defaultSettings, ...parsed };
      }
    } catch (err) {
      console.error('Failed to read settings file:', err);
    }
    return {
      ...defaultSettings,
      defaultDownloadPath: app.getPath('downloads') || path.join(process.env.USERPROFILE || '', 'Downloads'),
    };
  }

  public saveSettings(newSettings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(updated, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
    return updated;
  }

  public getHistory(): HistoryItem[] {
    try {
      if (fs.existsSync(this.historyFile)) {
        const raw = fs.readFileSync(this.historyFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to read history file:', err);
    }
    return [];
  }

  public saveHistory(history: HistoryItem[]): void {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  }

  public addHistoryItem(item: HistoryItem): void {
    const current = this.getHistory();
    // Prepend new item and keep up to 100 entries
    const updated = [item, ...current.filter((i) => i.id !== item.id)].slice(0, 100);
    this.saveHistory(updated);
  }

  public deleteHistoryItem(id: string): boolean {
    const current = this.getHistory();
    const updated = current.filter((i) => i.id !== id);
    this.saveHistory(updated);
    return true;
  }

  public clearHistory(): boolean {
    this.saveHistory([]);
    return true;
  }
}

export const storageService = new StorageService();
