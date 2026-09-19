import React, { useState } from 'react';
import {
  Download,
  Folder,
  Sliders,
  ShieldAlert,
  Sparkles,
  Music,
  Film,
  Check,
  Headphones,
  Zap,
} from 'lucide-react';
import {
  QualityPreset,
  ContainerOption,
  AudioQualityOption,
  VideoMetadata,
} from '../../../shared/types';

interface DownloadOptionsProps {
  metadata: VideoMetadata;
  quality: QualityPreset;
  setQuality: (q: QualityPreset) => void;
  container: ContainerOption;
  setContainer: (c: ContainerOption) => void;
  audioQuality: AudioQualityOption;
  setAudioQuality: (a: AudioQualityOption) => void;
  downloadPath: string;
  onSelectFolder: () => void;
  onStartDownload: () => void;
  onQuickDownloadMp3?: () => void;
  isDownloading: boolean;
}

export const DownloadOptions: React.FC<DownloadOptionsProps> = ({
  metadata,
  quality,
  setQuality,
  container,
  setContainer,
  audioQuality,
  setAudioQuality,
  downloadPath,
  onSelectFolder,
  onStartDownload,
  onQuickDownloadMp3,
  isDownloading,
}) => {
  const isAudioOnly = quality === 'audio_only' || container === 'mp3' || container === 'm4a';
  const [activeMode, setActiveMode] = useState<'video' | 'audio'>(isAudioOnly ? 'audio' : 'video');

  const maxRes =
    metadata.maxDownloadableResolution ||
    (metadata.availableResolutions.length > 0 ? metadata.availableResolutions[0] : 1080);

  // Handle mode toggle
  const handleModeChange = (mode: 'video' | 'audio') => {
    setActiveMode(mode);
    if (mode === 'audio') {
      setQuality('audio_only');
      if (container !== 'mp3' && container !== 'm4a') {
        setContainer('mp3');
      }
      if (audioQuality === 'best') {
        setAudioQuality('320k');
      }
    } else {
      if (quality === 'audio_only') {
        setQuality('best');
      }
      if (container === 'mp3' || container === 'm4a') {
        setContainer('mp4');
      }
    }
  };

  // Check if selected quality is available
  const getQualityAvailability = (): { available: boolean; message?: string } => {
    if (activeMode === 'audio' || quality === 'best' || quality === 'audio_only') {
      return { available: true };
    }
    const heightMatch = quality.match(/^(\d+)p$/);
    if (!heightMatch) return { available: true };
    const reqHeight = parseInt(heightMatch[1], 10);

    const resOpt = metadata.resolutionOptions?.find((r) => r.resolution === reqHeight);
    if (resOpt) {
      if (!resOpt.isDownloadable) {
        return {
          available: false,
          message: `${quality} is not available for this video from YouTube. The highest downloadable resolution is ${maxRes}p.`,
        };
      }
      return { available: true };
    }

    if (reqHeight > maxRes) {
      return {
        available: false,
        message: `${quality} is not available for this video (Highest available is ${maxRes}p). Try selecting ${maxRes}p or 'Best Available'.`,
      };
    }
    return { available: true };
  };

  const availability = getQualityAvailability();

  const qualityOptions: { id: QualityPreset; label: string; minHeight?: number }[] = [
    { id: 'best', label: `Best Available (Auto up to ${maxRes}p)` },
    { id: '2160p', label: '4K Ultra HD (2160p)', minHeight: 2160 },
    { id: '1440p', label: '2K Quad HD (1440p)', minHeight: 1440 },
    { id: '1080p', label: 'Full HD (1080p)', minHeight: 1080 },
    { id: '720p', label: 'HD (720p)', minHeight: 720 },
    { id: '480p', label: 'Standard (480p)', minHeight: 480 },
    { id: '360p', label: 'Low (360p)', minHeight: 360 },
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-2xl space-y-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-white font-bold text-sm tracking-wide">
          <Sliders className="w-4 h-4 text-rose-500" />
          <span>Download Configuration</span>
        </div>

        {/* Mode Toggle Tabs: Video vs Audio (MP3) */}
        <div className="flex items-center bg-darkbg-950 p-1 rounded-xl border border-slate-800/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleModeChange('video')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'video'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video & Audio</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('audio')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'audio'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio Only (MP3)</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Video & Audio Settings */}
      {activeMode === 'video' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quality Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Video Resolution</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Max {maxRes}p</span>
            </label>
            <div className="relative">
              <select
                value={quality === 'audio_only' ? 'best' : quality}
                onChange={(e) => setQuality(e.target.value as QualityPreset)}
                className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700/80 p-2.5 pr-8 focus:outline-none focus:border-rose-500 transition-colors"
              >
                {qualityOptions.map((opt) => {
                  const optInfo = metadata.resolutionOptions?.find((r) => r.resolution === opt.minHeight);
                  const isAvailable =
                    opt.id === 'best' ||
                    (optInfo ? optInfo.isDownloadable : opt.minHeight ? opt.minHeight <= maxRes : true);

                  let suffix = '';
                  if (opt.minHeight) {
                    if (isAvailable) {
                      suffix = optInfo?.videoCodec ? ` — ✓ (${optInfo.videoCodec})` : ' — ✓ Available';
                    } else {
                      suffix = ' — ✗ Unavailable';
                    }
                  }

                  return (
                    <option key={opt.id} value={opt.id} className="bg-darkbg-900 text-slate-100 py-1">
                      {opt.label}
                      {suffix}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Container Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Container Format</label>
            <select
              value={container === 'mp3' || container === 'm4a' ? 'mp4' : container}
              onChange={(e) => setContainer(e.target.value as ContainerOption)}
              className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700/80 p-2.5 pr-8 focus:outline-none focus:border-rose-500 transition-colors"
            >
              <option value="mp4" className="bg-darkbg-900">
                MP4 (Best Universal Compatibility)
              </option>
              <option value="mkv" className="bg-darkbg-900">
                MKV (Universal Container)
              </option>
              <option value="webm" className="bg-darkbg-900">
                WEBM (VP9 / Opus)
              </option>
            </select>
          </div>

          {/* Audio Bitrate Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Audio Track Bitrate</label>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value as AudioQualityOption)}
              className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700/80 p-2.5 pr-8 focus:outline-none focus:border-rose-500 transition-colors"
            >
              <option value="best" className="bg-darkbg-900">
                Best Available Source Bitrate
              </option>
              <option value="320k" className="bg-darkbg-900">
                320 kbps (Studio Quality)
              </option>
              <option value="256k" className="bg-darkbg-900">
                256 kbps (High Quality)
              </option>
              <option value="192k" className="bg-darkbg-900">
                192 kbps (Standard Quality)
              </option>
              <option value="128k" className="bg-darkbg-900">
                128 kbps (Compact Size)
              </option>
            </select>
          </div>
        </div>
      ) : (
        /* Mode 2: Audio Only (MP3) Settings */
        <div className="space-y-4">
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/20 rounded-xl flex items-center space-x-3 text-amber-200 text-xs">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="leading-relaxed">
              <strong className="text-white font-semibold">Audio-Only Extraction Mode:</strong> LocalTube will download the highest fidelity audio stream and convert it to <span className="font-mono font-bold text-amber-300 uppercase">.{container}</span> locally with zero cloud compression.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Audio Container Format</label>
              <select
                value={container === 'm4a' ? 'm4a' : 'mp3'}
                onChange={(e) => setContainer(e.target.value as ContainerOption)}
                className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700/80 p-2.5 pr-8 focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="mp3" className="bg-darkbg-900">
                  MP3 (Universal Compatibility — Recommended)
                </option>
                <option value="m4a" className="bg-darkbg-900">
                  M4A (Apple / AAC Pristine Audio)
                </option>
              </select>
            </div>

            {/* Audio Bitrate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Audio Bitrate / Quality</label>
              <select
                value={audioQuality}
                onChange={(e) => setAudioQuality(e.target.value as AudioQualityOption)}
                className="w-full bg-darkbg-800 text-slate-100 text-xs font-medium rounded-xl border border-slate-700/80 p-2.5 pr-8 focus:outline-none focus:border-amber-500 transition-colors"
              >
                <option value="320k" className="bg-darkbg-900">
                  320 kbps (Studio Quality / Highest)
                </option>
                <option value="256k" className="bg-darkbg-900">
                  256 kbps (High Quality)
                </option>
                <option value="192k" className="bg-darkbg-900">
                  192 kbps (Standard Quality)
                </option>
                <option value="128k" className="bg-darkbg-900">
                  128 kbps (Compact Size)
                </option>
                <option value="best" className="bg-darkbg-900">
                  Best Available Source Bitrate
                </option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Save Folder Location Picker */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-semibold text-slate-300">Save Location</label>
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center bg-darkbg-800/90 rounded-xl border border-slate-700/80 px-3 py-2 text-xs text-slate-200 truncate font-mono">
            <Folder className="w-3.5 h-3.5 text-rose-400 mr-2 flex-shrink-0" />
            <span className="truncate" title={downloadPath}>
              {downloadPath || 'Default Downloads folder'}
            </span>
          </div>
          <button
            type="button"
            onClick={onSelectFolder}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex-shrink-0 shadow-sm"
          >
            Browse...
          </button>
        </div>
      </div>

      {/* Warning if requested quality is unavailable */}
      {!availability.available && activeMode === 'video' && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-rose-300 text-xs">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed font-medium">{availability.message}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
        {/* Quick MP3 Action Button when in Video mode */}
        {activeMode === 'video' && (
          <button
            type="button"
            onClick={() => {
              if (onQuickDownloadMp3) {
                onQuickDownloadMp3();
              } else {
                handleModeChange('audio');
                setTimeout(() => onStartDownload(), 50);
              }
            }}
            disabled={isDownloading}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all shadow-md active:scale-[0.98]"
            title="Instantly download MP3 audio without changing video settings"
          >
            <Music className="w-4 h-4 text-amber-400" />
            <span>Download MP3 Only</span>
          </button>
        )}

        {/* Primary Download Button */}
        <button
          onClick={onStartDownload}
          disabled={isDownloading || (!availability.available && activeMode === 'video')}
          className={`flex items-center space-x-2.5 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 shadow-xl ${
            isDownloading || (!availability.available && activeMode === 'video')
              ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              : activeMode === 'audio'
              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-[0.98]'
              : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-rose-600/30 hover:shadow-rose-600/50 active:scale-[0.98]'
          }`}
        >
          {activeMode === 'audio' ? (
            <>
              <Music className="w-4 h-4" />
              <span>
                {metadata.isPlaylist
                  ? `Download Playlist as MP3 (${metadata.playlistCount} Audio Tracks)`
                  : 'Download MP3 Audio (320k)'}
              </span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>
                {metadata.isPlaylist
                  ? `Download Playlist (${metadata.playlistCount} Videos)`
                  : 'Start Download'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

