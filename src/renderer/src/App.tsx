import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { VideoPreview } from './components/VideoPreview';
import { DownloadOptions } from './components/DownloadOptions';
import { ActiveDownloads } from './components/ActiveDownloads';
import { HistoryList } from './components/HistoryList';
import { SettingsModal } from './components/SettingsModal';
import { DependencyWizard } from './components/DependencyWizard';
import {
  VideoMetadata,
  QualityPreset,
  ContainerOption,
  AudioQualityOption,
  DownloadTask,
  DownloadProgress,
  AppSettings,
  DependencyStatus,
  HistoryItem,
  ExtractionResult,
  SupportedBrowser,
} from '../../shared/types';
import {
  AlertCircle,
  CheckCircle2,
  X,
  ShieldAlert,
  Globe,
  RefreshCw,
  Sparkles,
  Info,
  Settings as SettingsIcon,
  AlertTriangle,
} from 'lucide-react';

const defaultAppSettings: AppSettings = {
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

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'downloader' | 'downloads' | 'history' | 'settings'>('downloader');
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  // Download form state
  const [quality, setQuality] = useState<QualityPreset>('best');
  const [container, setContainer] = useState<ContainerOption>('mp4');
  const [audioQuality, setAudioQuality] = useState<AudioQualityOption>('best');
  const [downloadPath, setDownloadPath] = useState('');

  // Tasks & History
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [dependencyStatus, setDependencyStatus] = useState<DependencyStatus | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Global Toast / Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      if (window.api) {
        const [loadedSettings, deps, history] = await Promise.all([
          window.api.getSettings(),
          window.api.checkDependencies(),
          window.api.getHistory(),
        ]);

        if (loadedSettings) {
          setSettings(loadedSettings);
          setDownloadPath(loadedSettings.defaultDownloadPath);
          setQuality(loadedSettings.defaultQuality);
          setContainer(loadedSettings.defaultContainer);
          setAudioQuality(loadedSettings.defaultAudioQuality);
        }

        if (deps) {
          setDependencyStatus(deps);
          if (!deps.allReady) {
            setShowWizard(true);
          }
        }

        if (history) {
          setHistoryItems(history);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    if (window.api) {
      // Register download progress listener
      const unsubProgress = window.api.onDownloadProgress((progress: DownloadProgress) => {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === progress.downloadId) {
              return {
                ...t,
                status: progress.status,
                progress: progress.progress,
                speed: progress.speed,
                eta: progress.eta,
                statusText: progress.statusText,
              };
            }
            return t;
          })
        );
      });

      // Register download completed listener
      const unsubCompleted = window.api.onDownloadCompleted(async (task: DownloadTask) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'completed', progress: 100 } : t))
        );
        showSuccess(`Downloaded successfully: ${task.title}`);
        // Refresh history
        const refreshed = await window.api.getHistory();
        setHistoryItems(refreshed);
      });

      // Register download error listener
      const unsubError = window.api.onDownloadError((err) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === err.downloadId ? { ...t, status: 'failed', error: err.error } : t))
        );
        showError(`Download failed: ${err.error}`);
      });

      return () => {
        unsubProgress();
        unsubCompleted();
        unsubError();
      };
    }
  }, [loadInitialData]);

  // Handle URL Analyze
  const handleAnalyze = async (browserOverride?: SupportedBrowser) => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    setExtractionResult(null);

    try {
      if (!window.api) {
        throw new Error('Desktop API bridge is not ready.');
      }
      const result = await window.api.analyzeVideo(url.trim(), browserOverride);
      setExtractionResult(result);

      if (result.status === 'SUCCESS') {
        if (result.metadata) {
          setMetadata(result.metadata);
          if (result.metadata.availableResolutions.length > 0) {
            const topRes = result.metadata.availableResolutions[0];
            if (topRes >= 1080 && settings.defaultQuality === '1080p') {
              setQuality('1080p');
            } else if (result.metadata.availableResolutions.includes(1080)) {
              setQuality('1080p');
            } else {
              setQuality('best');
            }
          }
        }
      } else if (result.status === 'PARTIAL') {
        if (result.metadata) {
          setMetadata(result.metadata);
        }
      } else {
        // Failed / Bot Check / Rate Limited / Auth Required
        setMetadata(null);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to analyze video URL.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick switch browser session and re-analyze
  const handleQuickBrowserSelect = async (browser: SupportedBrowser) => {
    try {
      if (window.api) {
        const updated = await window.api.saveSettings({ browserForCookies: browser });
        setSettings(updated);
        showSuccess(`Switched session to ${browser.toUpperCase()}. Re-analyzing stream...`);
      }
      handleAnalyze(browser);
    } catch (err: any) {
      showError(`Failed to apply browser session: ${err.message}`);
    }
  };

  // Handle Start Download
  const handleStartDownload = async () => {
    if (!url.trim() || !metadata) return;

    try {
      if (!window.api) {
        throw new Error('Desktop API bridge is not ready.');
      }

      const res = await window.api.startDownload({
        url: url.trim(),
        quality,
        container,
        audioQuality,
        downloadPath: downloadPath || settings.defaultDownloadPath,
        isPlaylist: metadata.isPlaylist,
        playlistCount: metadata.playlistCount,
      });

      // Add task to local UI queue
      const newTask: DownloadTask = {
        id: res.downloadId,
        url: url.trim(),
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        quality,
        container,
        downloadPath: downloadPath || settings.defaultDownloadPath,
        status: 'downloading',
        progress: 0,
        speed: 'Connecting...',
        downloadedBytes: 0,
        totalBytes: 0,
        eta: '--:--',
        createdAt: Date.now(),
        isPlaylist: metadata.isPlaylist,
        playlistTotal: metadata.playlistCount,
      };

      setTasks((prev) => [newTask, ...prev]);
      setCurrentTab('downloads');
      showSuccess(
        metadata.isPlaylist
          ? `Starting playlist ${container === 'mp3' ? 'MP3 ' : ''}download (${metadata.playlistCount} items)...`
          : container === 'mp3'
          ? 'Starting MP3 audio extraction (320k)...'
          : 'Download started.'
      );
    } catch (err: any) {
      showError(err.message || 'Failed to start download.');
    }
  };

  // Instant 1-Click MP3 Download
  const handleQuickDownloadMp3 = async () => {
    if (!url.trim() || !metadata) return;

    try {
      if (!window.api) {
        throw new Error('Desktop API bridge is not ready.');
      }

      const res = await window.api.startDownload({
        url: url.trim(),
        quality: 'audio_only',
        container: 'mp3',
        audioQuality: '320k',
        downloadPath: downloadPath || settings.defaultDownloadPath,
        isPlaylist: metadata.isPlaylist,
        playlistCount: metadata.playlistCount,
      });

      const newTask: DownloadTask = {
        id: res.downloadId,
        url: url.trim(),
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        quality: 'audio_only',
        container: 'mp3',
        downloadPath: downloadPath || settings.defaultDownloadPath,
        status: 'downloading',
        progress: 0,
        speed: 'Extracting audio...',
        downloadedBytes: 0,
        totalBytes: 0,
        eta: '--:--',
        createdAt: Date.now(),
        isPlaylist: metadata.isPlaylist,
        playlistTotal: metadata.playlistCount,
      };

      setTasks((prev) => [newTask, ...prev]);
      setCurrentTab('downloads');
      showSuccess('Downloading 320 kbps MP3 audio...');
    } catch (err: any) {
      showError(err.message || 'Failed to start MP3 download.');
    }
  };

  // Cancel Download
  const handleCancelDownload = async (downloadId: string) => {
    try {
      if (window.api) {
        await window.api.cancelDownload(downloadId);
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === downloadId ? { ...t, status: 'cancelled' } : t))
      );
    } catch (err: any) {
      showError(err.message || 'Failed to cancel download.');
    }
  };

  // Select Save Folder
  const handleSelectFolder = async (): Promise<string | null> => {
    if (!window.api) return null;
    try {
      const selected = await window.api.selectFolder(downloadPath);
      if (selected) {
        setDownloadPath(selected);
        return selected;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  // Select File Dialog (for settings)
  const handleSelectFile = async (title: string): Promise<string | null> => {
    if (!window.api) return null;
    return await window.api.selectFile(title);
  };

  // Open File
  const handleOpenFile = async (filePath: string) => {
    if (window.api && filePath) {
      const success = await window.api.openFile(filePath);
      if (!success) {
        showError('Could not open the file. It may have been moved or deleted.');
      }
    }
  };

  // Open Folder
  const handleOpenFolder = async (filePath: string) => {
    if (window.api && filePath) {
      await window.api.openFolder(filePath);
    }
  };

  // Check Dependencies
  const handleCheckDependencies = async () => {
    if (window.api) {
      const status = await window.api.checkDependencies();
      setDependencyStatus(status);
      if (status.allReady) {
        showSuccess('All engine dependencies verified successfully!');
      } else {
        showError('Some dependencies are missing. Please configure paths or place binaries in resources/bin.');
      }
    }
  };

  // Update yt-dlp
  const handleUpdateYtDlp = async () => {
    if (window.api) {
      const res = await window.api.updateYtDlp();
      if (res.success) {
        showSuccess(res.message);
        await handleCheckDependencies();
      } else {
        showError(res.message);
      }
    }
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    if (window.api) {
      const saved = await window.api.saveSettings(newSettings);
      setSettings(saved);
      if (saved.defaultDownloadPath) {
        setDownloadPath(saved.defaultDownloadPath);
      }
      showSuccess('Settings updated.');
    }
  };

  // Delete / Clear History
  const handleDeleteHistoryItem = async (id: string) => {
    if (window.api) {
      await window.api.deleteHistoryItem(id);
      setHistoryItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleClearHistory = async () => {
    if (window.api) {
      await window.api.clearHistory();
      setHistoryItems([]);
      showSuccess('Download history cleared.');
    }
  };

  const activeDownloadsCount = tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'merging' || t.status === 'queued'
  ).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-darkbg-900 text-slate-100 font-sans select-none">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(t) => setCurrentTab(t)}
        activeDownloadsCount={activeDownloadsCount}
        dependencyStatus={dependencyStatus}
        onOpenSettings={() => setCurrentTab('settings')}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Toast Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs text-red-300 shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Toast Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300 shadow-xl backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Switcher */}
        {showWizard && (!dependencyStatus?.allReady) ? (
          <DependencyWizard
            dependencyStatus={dependencyStatus}
            onCheckDependencies={handleCheckDependencies}
            onOpenSettings={() => {
              setShowWizard(false);
              setCurrentTab('settings');
            }}
            onContinue={() => setShowWizard(false)}
          />
        ) : (
          <>
            {currentTab === 'downloader' && (
              <div className="space-y-6">
                {/* Hero / Input Section */}
                <div className="text-center space-y-1 py-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Download Any Video Locally
                  </h2>
                  <p className="text-xs text-slate-400">
                    Highest resolution audio & video streams merged on-device with zero cloud processing.
                  </p>
                </div>

                <UrlInput
                  url={url}
                  setUrl={setUrl}
                  onAnalyze={() => handleAnalyze()}
                  isLoading={isAnalyzing}
                />

                {/* Extraction Status Alert / Browser Authentication Card */}
                {extractionResult && extractionResult.status !== 'SUCCESS' && (
                  <div
                    className={`rounded-2xl p-5 border backdrop-blur-md shadow-2xl transition-all ${
                      extractionResult.status === 'BOT_CHECK' || extractionResult.status === 'AUTH_REQUIRED'
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : extractionResult.status === 'RATE_LIMITED'
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : extractionResult.status === 'PARTIAL'
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
                        : 'bg-red-950/30 border-red-500/40 text-red-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2 rounded-xl bg-white/10 flex-shrink-0 mt-0.5">
                        {extractionResult.status === 'BOT_CHECK' ? (
                          <ShieldAlert className="w-5 h-5 text-amber-400" />
                        ) : extractionResult.status === 'RATE_LIMITED' ? (
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                        ) : extractionResult.status === 'PARTIAL' ? (
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h3 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
                            <span>
                              {extractionResult.status === 'BOT_CHECK'
                                ? 'YouTube Bot Verification / PO-Token Required'
                                : extractionResult.status === 'RATE_LIMITED'
                                ? 'YouTube Rate Limit Detected (HTTP 429)'
                                : extractionResult.status === 'PARTIAL'
                                ? 'Restricted Stream Quality (Adaptive 1080p/4K Throttled)'
                                : extractionResult.status === 'AUTH_REQUIRED'
                                ? 'Sign-In Required (Private/Age-Gated)'
                                : 'Stream Extraction Incomplete'}
                            </span>
                          </h3>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                              extractionResult.status === 'BOT_CHECK'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : extractionResult.status === 'PARTIAL'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-red-500/20 text-red-300 border-red-500/40'
                            }`}
                          >
                            STATUS: {extractionResult.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {extractionResult.message ||
                            'YouTube has restricted direct anonymous stream extraction. Use your local browser session to verify the request locally and unlock Full HD / 4K qualities.'}
                        </p>

                        {/* Quick 1-Click Browser Cookie Resolvers */}
                        {extractionResult.canUseBrowserSession && (
                          <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
                            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-200">
                              <Globe className="w-3.5 h-3.5 text-rose-400" />
                              <span>1-Click Solve: Use Local Browser Session (No login export needed):</span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {(['chrome', 'edge', 'firefox', 'brave', 'opera'] as SupportedBrowser[]).map(
                                (browser) => (
                                  <button
                                    key={browser}
                                    onClick={() => handleQuickBrowserSelect(browser)}
                                    disabled={isAnalyzing}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize flex items-center space-x-1.5 transition-all shadow-md active:scale-95 ${
                                      settings.browserForCookies === browser
                                        ? 'bg-rose-600 text-white shadow-rose-600/30'
                                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                    }`}
                                  >
                                    <Globe className="w-3 h-3 text-slate-400" />
                                    <span>{browser}</span>
                                    {settings.browserForCookies === browser && (
                                      <span className="text-[10px] bg-white/20 px-1 rounded ml-1 font-mono">Active</span>
                                    )}
                                  </button>
                                )
                              )}

                              <button
                                onClick={() => handleAnalyze()}
                                disabled={isAnalyzing}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-all active:scale-95"
                              >
                                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                <span>Retry</span>
                              </button>

                              <button
                                onClick={() => setCurrentTab('settings')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-700 text-slate-400 border border-slate-800 flex items-center space-x-1.5 transition-all"
                              >
                                <SettingsIcon className="w-3 h-3" />
                                <span>Settings</span>
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                              Note: Reads cookies safely from your local browser directory without sending data anywhere.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Preview Card */}
                {metadata && <VideoPreview metadata={metadata} />}

                {/* Download Configuration Panel */}
                {metadata && (
                  <DownloadOptions
                    metadata={metadata}
                    quality={quality}
                    setQuality={setQuality}
                    container={container}
                    setContainer={setContainer}
                    audioQuality={audioQuality}
                    setAudioQuality={setAudioQuality}
                    downloadPath={downloadPath}
                    onSelectFolder={handleSelectFolder}
                    onStartDownload={handleStartDownload}
                    onQuickDownloadMp3={handleQuickDownloadMp3}
                    isDownloading={isAnalyzing}
                  />
                )}
              </div>
            )}

            {currentTab === 'downloads' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Active & Recent Downloads
                  </h2>
                  <span className="text-xs text-slate-400">{tasks.length} total tasks</span>
                </div>
                <ActiveDownloads
                  tasks={tasks}
                  onCancel={handleCancelDownload}
                  onOpenFile={handleOpenFile}
                  onOpenFolder={handleOpenFolder}
                />
              </div>
            )}

            {currentTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Completed Downloads History
                  </h2>
                  <span className="text-xs text-slate-400">{historyItems.length} saved</span>
                </div>
                <HistoryList
                  items={historyItems}
                  onOpenFile={handleOpenFile}
                  onOpenFolder={handleOpenFolder}
                  onDeleteItem={handleDeleteHistoryItem}
                  onClearHistory={handleClearHistory}
                />
              </div>
            )}

            {currentTab === 'settings' && (
              <SettingsModal
                settings={settings}
                dependencyStatus={dependencyStatus}
                onSaveSettings={handleSaveSettings}
                onCheckDependencies={handleCheckDependencies}
                onUpdateYtDlp={handleUpdateYtDlp}
                onSelectFolder={handleSelectFolder}
                onSelectFile={handleSelectFile}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Info */}
      <footer className="h-8 px-6 border-t border-slate-800/80 bg-darkbg-900 flex items-center justify-between text-[11px] text-slate-500 select-none">
        <div className="flex items-center space-x-2">
          <span>LocalTube Downloader</span>
          <span>•</span>
          <span>100% Local Processing</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Target: Windows 10/11</span>
          <span>•</span>
          <span className="text-slate-400">FFmpeg + yt-dlp Core</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
