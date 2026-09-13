import React from 'react';
import {
  Download,
  XCircle,
  FolderOpen,
  FileCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HardDrive,
  Gauge,
  Timer,
  Play,
} from 'lucide-react';
import { DownloadTask } from '../../../shared/types';

interface ActiveDownloadsProps {
  tasks: DownloadTask[];
  onCancel: (downloadId: string) => void;
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string) => void;
}

export const ActiveDownloads: React.FC<ActiveDownloadsProps> = ({
  tasks,
  onCancel,
  onOpenFile,
  onOpenFolder,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-darkbg-800 border border-slate-700/60 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
          <Download className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1">No Active Downloads</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Paste a YouTube link above and click Analyze to start downloading videos locally.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: DownloadTask['status']) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            Downloading
          </span>
        );
      case 'merging':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            FFmpeg Merging
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-400" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
            <XCircle className="w-3 h-3 text-slate-400" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
            Queued
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const isFinished = task.status === 'completed';
        const isFailed = task.status === 'failed';
        const isCancelled = task.status === 'cancelled';
        const isActive = task.status === 'downloading' || task.status === 'merging' || task.status === 'queued';

        return (
          <div
            key={task.id}
            className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-xl space-y-4 relative overflow-hidden transition-all hover:border-slate-700"
          >
            {/* Header: Title, Tags & Status */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                {task.thumbnail ? (
                  <img
                    src={task.thumbnail}
                    alt={task.title}
                    className="w-14 h-10 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-10 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4
                    className="text-sm font-bold text-white truncate max-w-md"
                    title={task.title}
                  >
                    {task.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-semibold text-rose-400 uppercase">
                      {task.quality}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-300 uppercase">
                      {task.container}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                {getStatusBadge(task.status)}
              </div>
            </div>

            {/* Progress Bar & Real-time Metrics */}
            <div className="space-y-2">
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800/80 relative">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isFinished
                      ? 'bg-emerald-500'
                      : isFailed
                      ? 'bg-red-500'
                      : isCancelled
                      ? 'bg-slate-600'
                      : 'bg-gradient-to-r from-rose-600 to-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                />
              </div>

              {/* Progress metrics row */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono pt-1">
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-slate-100 font-sans">
                    {task.progress.toFixed(1)}%
                  </span>

                  {isActive && task.speed && (
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Gauge className="w-3.5 h-3.5 text-rose-400" />
                      <span>{task.speed}</span>
                    </div>
                  )}

                  {isActive && task.eta && task.eta !== '--:--' && (
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span>ETA {task.eta}</span>
                    </div>
                  )}
                </div>

                {task.statusText && (
                  <span className="text-[11px] text-slate-400 truncate max-w-xs font-sans">
                    {task.statusText}
                  </span>
                )}
              </div>
            </div>

            {/* Error Message banner if failed */}
            {task.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{task.error}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800/60">
              {isActive && (
                <button
                  type="button"
                  onClick={() => onCancel(task.id)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Download</span>
                </button>
              )}

              {isFinished && task.outputPath && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenFile(task.outputPath!)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Play File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenFolder(task.outputPath!)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Folder</span>
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
