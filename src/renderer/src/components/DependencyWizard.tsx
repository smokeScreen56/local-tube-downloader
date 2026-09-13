import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Settings,
  ArrowRight,
  FolderOpen,
  RefreshCw,
  HardDrive,
  Info,
} from 'lucide-react';
import { DependencyStatus } from '../../../shared/types';

interface DependencyWizardProps {
  dependencyStatus: DependencyStatus | null;
  onCheckDependencies: () => Promise<void>;
  onOpenSettings: () => void;
  onContinue: () => void;
}

export const DependencyWizard: React.FC<DependencyWizardProps> = ({
  dependencyStatus,
  onCheckDependencies,
  onOpenSettings,
  onContinue,
}) => {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    await onCheckDependencies();
    setIsChecking(false);
  };

  const isReady = dependencyStatus?.allReady ?? false;

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-6">
      {/* App Logo */}
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 p-[2px] mx-auto shadow-xl shadow-rose-500/20">
        <div className="w-full h-full bg-darkbg-900 rounded-[22px] flex items-center justify-center">
          <Play className="w-8 h-8 text-rose-500 fill-rose-500 ml-1" />
        </div>
      </div>

      {/* Welcome Title */}
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white tracking-tight">
          Welcome to <span className="text-rose-500">LocalTube</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          LocalTube uses <strong className="text-slate-200">yt-dlp</strong> and{' '}
          <strong className="text-slate-200">FFmpeg</strong> to download, convert, and merge video and audio entirely on your computer.
        </p>
      </div>

      {/* Dependency Status Card */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Engine Status Check
          </span>
          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="flex items-center space-x-1 text-xs text-rose-400 hover:text-rose-300 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Again</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* yt-dlp */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-darkbg-800 border border-slate-750">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  dependencyStatus?.ytdlp.found
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {dependencyStatus?.ytdlp.found ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">yt-dlp Engine</h4>
                <p className="text-[11px] text-slate-400">
                  {dependencyStatus?.ytdlp.found
                    ? `Found (${dependencyStatus.ytdlp.version || 'Ready'})`
                    : 'Not found on system or resources/bin'}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                dependencyStatus?.ytdlp.found
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {dependencyStatus?.ytdlp.found ? 'Ready' : 'Missing'}
            </span>
          </div>

          {/* FFmpeg */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-darkbg-800 border border-slate-750">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  dependencyStatus?.ffmpeg.found
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {dependencyStatus?.ffmpeg.found ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">FFmpeg Stream Merger</h4>
                <p className="text-[11px] text-slate-400">
                  {dependencyStatus?.ffmpeg.found
                    ? `Found (${dependencyStatus.ffmpeg.version || 'Ready'})`
                    : 'Not found on system or resources/bin'}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                dependencyStatus?.ffmpeg.found
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {dependencyStatus?.ffmpeg.found ? 'Ready' : 'Missing'}
            </span>
          </div>
        </div>

        {/* Quick Instructions */}
        {!isReady && (
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-left space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>How to setup:</span>
            </div>
            <p>
              1. Place <code className="text-rose-400 font-mono">yt-dlp.exe</code> and{' '}
              <code className="text-rose-400 font-mono">ffmpeg.exe</code> in the app's{' '}
              <code className="text-slate-200 font-mono">resources/bin/</code> folder, or
            </p>
            <p>2. Configure their paths in Settings, or add them to your Windows system PATH.</p>
          </div>
        )}
      </div>

      {/* Bottom CTA buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onOpenSettings}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Configure Dependencies</span>
        </button>

        {isReady && (
          <button
            onClick={onContinue}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
          >
            <span>Continue to App</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
