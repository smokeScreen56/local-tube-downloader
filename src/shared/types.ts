export type QualityPreset =
  | 'best'
  | '2160p'
  | '1440p'
  | '1080p'
  | '720p'
  | '480p'
  | '360p'
  | 'audio_only';

export type ContainerOption = 'mp4' | 'mkv' | 'webm' | 'mp3' | 'm4a';

export type AudioQualityOption = 'best' | '320k' | '256k' | '192k' | '128k';

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution: string;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesizeApprox?: number;
  bitrate?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  duration?: number;
  durationString?: string;
  url: string;
  thumbnail?: string;
}

export type ExtractionStatus =
  | 'IDLE'
  | 'ANALYZING'
  | 'SUCCESS'
  | 'PARTIAL'
  | 'RATE_LIMITED'
  | 'BOT_CHECK'
  | 'AUTH_REQUIRED'
  | 'FAILED';

export type SupportedBrowser =
  | 'none'
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'brave'
  | 'opera'
  | 'vivaldi';

export interface ResolutionOption {
  resolution: number; // e.g. 2160, 1440, 1080, 720, 480, 360
  label: string; // e.g. "4K (2160p)", "Full HD (1080p)"
  isDownloadable: boolean;
  hasMp4Direct: boolean;
  videoCodec?: string;
  fps?: number;
  filesizeEstimate?: string;
  note?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  uploader: string;
  uploaderUrl?: string;
  duration: number; // in seconds
  durationString: string;
  thumbnail: string;
  webpage_url: string;
  viewCount?: number;
  uploadDate?: string;
  description?: string;
  availableResolutions: number[]; // e.g. [2160, 1440, 1080, 720, 480, 360]
  resolutionOptions: ResolutionOption[];
  maxDownloadableResolution?: number;
  formats: VideoFormat[];
  isPlaylist?: boolean;
  playlistCount?: number;
  playlistVideos?: PlaylistEntry[];
}

export interface ExtractionResult {
  status: ExtractionStatus;
  message?: string;
  metadata?: VideoMetadata;
  canUseBrowserSession?: boolean;
  requiresUpdate?: boolean;
}

export type DownloadStatus =
  | 'queued'
  | 'analyzing'
  | 'downloading'
  | 'merging'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface DownloadProgress {
  downloadId: string;
  status: DownloadStatus;
  progress: number; // 0 to 100
  speed: string; // e.g. "8.2 MB/s"
  downloadedBytes: number;
  totalBytes: number;
  eta: string; // e.g. "00:09"
  statusText?: string;
  error?: string;
  isPlaylist?: boolean;
  playlistCurrentIndex?: number;
  playlistTotal?: number;
  currentItemTitle?: string;
}

export interface DownloadRequest {
  url: string;
  quality: QualityPreset;
  container: ContainerOption;
  audioQuality: AudioQualityOption;
  downloadPath: string;
  customFilename?: string;
  isPlaylist?: boolean;
  playlistCount?: number;
}

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  duration: number;
  quality: QualityPreset;
  container: ContainerOption;
  downloadPath: string;
  outputPath?: string;
  status: DownloadStatus;
  progress: number;
  speed: string;
  downloadedBytes: number;
  totalBytes: number;
  eta: string;
  statusText?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
  isPlaylist?: boolean;
  playlistCurrentIndex?: number;
  playlistTotal?: number;
  currentItemTitle?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  date: string;
  resolution: string;
  container: string;
  outputPath: string;
  fileSize?: number;
  status: 'completed' | 'failed' | 'cancelled';
}

export interface SingleDependencyStatus {
  found: boolean;
  path: string;
  version?: string;
  source: 'bundled' | 'custom' | 'system' | 'none';
  isOutdated?: boolean;
  versionWarning?: string;
}

export interface DependencyStatus {
  ytdlp: SingleDependencyStatus;
  ffmpeg: SingleDependencyStatus;
  ffprobe: SingleDependencyStatus;
  allReady: boolean;
}

export interface AppSettings {
  defaultDownloadPath: string;
  defaultQuality: QualityPreset;
  defaultContainer: ContainerOption;
  defaultAudioQuality: AudioQualityOption;
  browserForCookies: SupportedBrowser;
  customYtDlpPath: string;
  customFfmpegPath: string;
  customFfprobePath: string;
  customYtDlpArgs: string;
  autoCheckUpdates: boolean;
  maxConcurrentDownloads: number;
}

export interface ElectronAPI {
  // Dependency management
  checkDependencies: () => Promise<DependencyStatus>;
  updateYtDlp: () => Promise<{ success: boolean; message: string; version?: string }>;

  // Video Analysis & Download
  analyzeVideo: (url: string, browserOverride?: SupportedBrowser) => Promise<ExtractionResult>;
  startDownload: (request: DownloadRequest) => Promise<{ downloadId: string }>;
  cancelDownload: (downloadId: string) => Promise<boolean>;

  // File system & shell
  selectFolder: (defaultPath?: string) => Promise<string | null>;
  selectFile: (title: string, filters?: { name: string; extensions: string[] }[]) => Promise<string | null>;
  openFile: (filePath: string) => Promise<boolean>;
  openFolder: (filePath: string) => Promise<boolean>;

  // Settings & History
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getHistory: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<boolean>;
  deleteHistoryItem: (id: string) => Promise<boolean>;

  // Real-time Event Listeners
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onDownloadCompleted: (callback: (task: DownloadTask) => void) => () => void;
  onDownloadError: (callback: (error: { downloadId: string; error: string }) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
