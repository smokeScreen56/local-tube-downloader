import React, { useState } from 'react';
import {
  Settings,
  CheckCircle2,
  AlertTriangle,
  Folder,
  FileCode,
  RefreshCw,
  Save,
  Cpu,
  Sliders,
  Check,
  FolderOpen,
  ArrowUpCircle,
  HelpCircle,
} from 'lucide-react';
import { AppSettings, DependencyStatus, QualityPreset, ContainerOption } from '../../../shared/types';

interface SettingsModalProps {
  settings: AppSettings;
  dependencyStatus: DependencyStatus | null;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onCheckDependencies: () => Promise<void>;
  onUpdateYtDlp: () => Promise<void>;
  onSelectFolder: () => Promise<string | null>;
  onSelectFile: (title: string) => Promise<string | null>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  dependencyStatus,
  onSaveSettings,
  onCheckDependencies,
  onUpdateYtDlp,
  onSelectFolder,
  onSelectFile,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveSettings(formData);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCheck = async () => {
    setIsChecking(true);
    await onCheckDependencies();
    setIsChecking(false);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    await onUpdateYtDlp();
    setIsUpdating(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner: Dependencies Diagnostic */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Cpu className="w-4 h-4 text-rose-500" />
            <span>Local Engine Dependencies</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>Re-check Diagnostics</span>
            </button>

            <button
              onClick={handleUpdate}
              disabled={isUpdating || !dependencyStatus?.ytdlp.found}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors"
            >
              <ArrowUpCircle className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>Update yt-dlp</span>
            </button>
          </div>
        </div>

        {/* 3 Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* yt-dlp */}
          <div
            className={`p-4 rounded-xl border ${
              dependencyStatus?.ytdlp.found
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-white">yt-dlp Engine</span>
              {dependencyStatus?.ytdlp.found ? (
                <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Found</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-red-400 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Missing</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {dependencyStatus?.ytdlp.version ? `Version: ${dependencyStatus.ytdlp.version}` : 'Not detected'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
              {dependencyStatus?.ytdlp.path || 'Configure path below or in PATH'}
            </p>
          </div>

          {/* ffmpeg */}
          <div
            className={`p-4 rounded-xl border ${
              dependencyStatus?.ffmpeg.found
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-white">FFmpeg Stream Merger</span>
              {dependencyStatus?.ffmpeg.found ? (
                <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Found</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-red-400 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Missing</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {dependencyStatus?.ffmpeg.version ? `Version: ${dependencyStatus.ffmpeg.version}` : 'Not detected'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
              {dependencyStatus?.ffmpeg.path || 'Required for merging video/audio'}
            </p>
          </div>

          {/* ffprobe */}
          <div
            className={`p-4 rounded-xl border ${
              dependencyStatus?.ffprobe.found
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-white">FFprobe Utility</span>
              {dependencyStatus?.ffprobe.found ? (
                <span className="flex items-center space-x-1 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Found</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-slate-400 text-xs font-medium">
                  <span>Optional</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {dependencyStatus?.ffprobe.version ? `Version: ${dependencyStatus.ffprobe.version}` : 'Optional component'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
              {dependencyStatus?.ffprobe.path || 'Auto-detected from FFmpeg'}
            </p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-rose-500" />
          <span>General Preferences</span>
        </div>

        <div className="space-y-4">
          {/* Default Folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Default Download Folder</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={formData.defaultDownloadPath}
                onChange={(e) => setFormData({ ...formData, defaultDownloadPath: e.target.value })}
                className="flex-1 bg-darkbg-800 text-xs font-mono text-slate-200 border border-slate-700 rounded-xl p-2.5 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const p = await onSelectFolder();
                  if (p) setFormData({ ...formData, defaultDownloadPath: p });
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Browse...
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Quality */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Default Video Quality</label>
              <select
                value={formData.defaultQuality}
                onChange={(e) => setFormData({ ...formData, defaultQuality: e.target.value as QualityPreset })}
                className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700 p-2.5 focus:outline-none focus:border-rose-500"
              >
                <option value="best">Best Available (Auto)</option>
                <option value="2160p">4K (2160p)</option>
                <option value="1440p">2K (1440p)</option>
                <option value="1080p">Full HD (1080p)</option>
                <option value="720p">HD (720p)</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>

            {/* Default Container */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Default Container</label>
              <select
                value={formData.defaultContainer}
                onChange={(e) => setFormData({ ...formData, defaultContainer: e.target.value as ContainerOption })}
                className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700 p-2.5 focus:outline-none focus:border-rose-500"
              >
                <option value="mp4">MP4 (Recommended)</option>
                <option value="mkv">MKV</option>
                <option value="webm">WEBM</option>
                <option value="mp3">MP3 (Audio Only)</option>
                <option value="m4a">M4A (Audio Only)</option>
              </select>
            </div>
          </div>

          {/* Browser Cookie Session */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <span>Browser Session (Bypass YouTube 429 & Bot-Verification)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-semibold">100% Local & Safe</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Allows yt-dlp to read your local browser session to resolve YouTube HTTP 429 and &quot;Sign in to confirm you&apos;re not a bot&quot; verification challenges without uploading any data.
            </p>
            <select
              value={formData.browserForCookies || 'none'}
              onChange={(e) => setFormData({ ...formData, browserForCookies: e.target.value as any })}
              className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700 p-2.5 focus:outline-none focus:border-rose-500"
            >
              <option value="none">None (Standard Extraction)</option>
              <option value="chrome">Google Chrome (Recommended)</option>
              <option value="edge">Microsoft Edge</option>
              <option value="firefox">Mozilla Firefox</option>
              <option value="brave">Brave Browser</option>
              <option value="opera">Opera</option>
              <option value="vivaldi">Vivaldi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Executable Paths */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
          <FileCode className="w-4 h-4 text-rose-500" />
          <span>Custom Executable Paths (Optional Override)</span>
        </div>

        <div className="space-y-3">
          {/* Custom yt-dlp */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Custom yt-dlp.exe Path</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Leave blank to use bundled or system PATH"
                value={formData.customYtDlpPath}
                onChange={(e) => setFormData({ ...formData, customYtDlpPath: e.target.value })}
                className="flex-1 bg-darkbg-800 text-xs font-mono text-slate-200 border border-slate-700 rounded-xl p-2.5 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const p = await onSelectFile('Select yt-dlp.exe');
                  if (p) setFormData({ ...formData, customYtDlpPath: p });
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Custom ffmpeg */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Custom ffmpeg.exe Path</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Leave blank to use bundled or system PATH"
                value={formData.customFfmpegPath}
                onChange={(e) => setFormData({ ...formData, customFfmpegPath: e.target.value })}
                className="flex-1 bg-darkbg-800 text-xs font-mono text-slate-200 border border-slate-700 rounded-xl p-2.5 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const p = await onSelectFile('Select ffmpeg.exe');
                  if (p) setFormData({ ...formData, customFfmpegPath: p });
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Additional yt-dlp arguments */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Additional yt-dlp Arguments</span>
              <span className="text-[10px] text-slate-500 font-normal">e.g. --throttled-rate 100K</span>
            </label>
            <input
              type="text"
              placeholder="e.g. --buffer-size 16K"
              value={formData.customYtDlpArgs}
              onChange={(e) => setFormData({ ...formData, customYtDlpArgs: e.target.value })}
              className="w-full bg-darkbg-800 text-xs font-mono text-slate-200 border border-slate-700 rounded-xl p-2.5 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end space-x-3 pt-2">
        {saveSuccess && (
          <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
            <Check className="w-4 h-4" />
            <span>Settings saved!</span>
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
};
