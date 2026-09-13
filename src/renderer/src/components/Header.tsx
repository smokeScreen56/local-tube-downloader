import React from 'react';
import { Download, History, Settings, Play, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DependencyStatus } from '../../../shared/types';

interface HeaderProps {
  currentTab: 'downloader' | 'downloads' | 'history' | 'settings';
  onTabChange: (tab: 'downloader' | 'downloads' | 'history' | 'settings') => void;
  activeDownloadsCount: number;
  dependencyStatus: DependencyStatus | null;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  activeDownloadsCount,
  dependencyStatus,
  onOpenSettings,
}) => {
  const isReady = dependencyStatus?.allReady ?? false;

  return (
    <header className="h-16 px-6 border-b border-slate-800/80 bg-darkbg-900/90 backdrop-blur-md flex items-center justify-between select-none sticky top-0 z-30">
      {/* Brand Logo & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 p-[1px] shadow-lg shadow-rose-500/20">
          <div className="w-full h-full bg-darkbg-900 rounded-[11px] flex items-center justify-center">
            <Play className="w-5 h-5 text-rose-500 fill-rose-500 ml-0.5" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Local<span className="text-rose-500">Tube</span>
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Local Video & Audio Downloader</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-darkbg-800/80 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => onTabChange('downloader')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'downloader'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Downloader</span>
        </button>

        <button
          onClick={() => onTabChange('downloads')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
            currentTab === 'downloads'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Active</span>
          {activeDownloadsCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-400 text-slate-950 rounded-full animate-pulse">
              {activeDownloadsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'history'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </nav>

      {/* Dependency Status & Settings Button */}
      <div className="flex items-center space-x-3">
        {/* Engine status indicator */}
        <button
          onClick={onOpenSettings}
          title={isReady ? 'Engine Ready: yt-dlp & FFmpeg verified' : 'Dependencies Missing: click to configure'}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            isReady
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 animate-pulse'
          }`}
        >
          {isReady ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Engine Ready</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Setup Required</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-xl border border-slate-800 transition-all ${
            currentTab === 'settings'
              ? 'bg-rose-600/10 text-rose-400 border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
          title="Settings & Tools"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
