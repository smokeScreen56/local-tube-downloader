import React from 'react';
import { Clock, User, Eye, Calendar, Film, CheckCircle2 } from 'lucide-react';
import { VideoMetadata } from '../../../shared/types';

interface VideoPreviewProps {
  metadata: VideoMetadata;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ metadata }) => {
  const formatViews = (views?: number) => {
    if (!views) return null;
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr || dateStr.length !== 8) return null;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start border border-slate-800/80 shadow-2xl relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Thumbnail */}
      <div className="relative w-full md:w-64 aspect-video rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800 shadow-md">
        {metadata.thumbnail ? (
          <img
            src={metadata.thumbnail}
            alt={metadata.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600">
            <Film className="w-10 h-10" />
          </div>
        )}

        {/* Duration / Count badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[11px] font-mono font-semibold text-white flex items-center space-x-1 border border-white/10 shadow-lg">
          <Clock className="w-3 h-3 text-rose-400" />
          <span>{metadata.isPlaylist ? `${metadata.playlistCount} Videos` : metadata.durationString}</span>
        </div>

        {metadata.isPlaylist && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-sm text-[10px] font-bold text-white flex items-center space-x-1 border border-rose-400/30 shadow-lg uppercase tracking-wider">
            <span>Playlist</span>
          </div>
        )}
      </div>

      {/* Video Information */}
      <div className="flex-1 flex flex-col justify-between min-w-0 h-full">
        <div>
          {/* Channel / Uploader */}
          <div className="flex items-center space-x-2 text-xs text-rose-400 font-semibold tracking-wide uppercase mb-1">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{metadata.uploader}</span>
            {metadata.isPlaylist && (
              <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded text-[9px] font-bold">
                Batch
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug line-clamp-2 hover:text-rose-300 transition-colors"
            title={metadata.title}
          >
            {metadata.title}
          </h2>

          {/* Metadata badges (views, date) */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
            {metadata.viewCount && (
              <div className="flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatViews(metadata.viewCount)}</span>
              </div>
            )}

            {metadata.uploadDate && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDate(metadata.uploadDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Available Resolutions Tags */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Verified Usable Streams:</span>
            </div>
            {metadata.maxDownloadableResolution && (
              <span className="text-[10px] text-emerald-400 font-bold">
                Max: {metadata.maxDownloadableResolution}p
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Dedicated Audio/MP3 Badge */}
            <span
              title="320 kbps high-fidelity audio track extraction available"
              className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gradient-to-r from-amber-500/15 to-rose-500/15 text-amber-300 border-amber-500/30 flex items-center space-x-1"
            >
              <span>🎵 MP3 / M4A (320k)</span>
            </span>

            {metadata.resolutionOptions && metadata.resolutionOptions.length > 0 ? (
              metadata.resolutionOptions
                .filter((opt) => opt.isDownloadable)
                .map((opt) => (
                  <span
                    key={opt.resolution}
                    title={opt.note || `${opt.resolution}p ${opt.videoCodec || ''}`}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      opt.resolution >= 2160
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : opt.resolution >= 1440
                        ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                        : opt.resolution >= 1080
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : opt.resolution >= 720
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {opt.resolution >= 2160 ? '4K 2160p' : opt.resolution >= 1440 ? '2K 1440p' : `${opt.resolution}p`}
                    {opt.videoCodec ? ` • ${opt.videoCodec}` : ''}
                  </span>
                ))
            ) : metadata.availableResolutions.length > 0 ? (
              metadata.availableResolutions.map((res) => (
                <span
                  key={res}
                  className="px-2 py-0.5 rounded text-[10px] font-bold border bg-rose-500/10 text-rose-300 border-rose-500/30"
                >
                  {res}p
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">Audio / generic streams detected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
