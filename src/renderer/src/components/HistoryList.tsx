import React, { useState } from 'react';
import {
  History,
  Trash2,
  FolderOpen,
  Play,
  Search,
  ExternalLink,
  Film,
  Calendar,
  CheckCircle2,
  Music,
} from 'lucide-react';
import { HistoryItem } from '../../../shared/types';

interface HistoryListProps {
  items: HistoryItem[];
  onOpenFile: (path: string) => void;
  onOpenFolder: (path: string) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onOpenFile,
  onOpenFolder,
  onDeleteItem,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search download history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-darkbg-800 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center space-x-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors self-end sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* History Items list */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-darkbg-800 border border-slate-700/60 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">
            {searchTerm ? 'No matching downloads' : 'No Download History'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchTerm
              ? 'Try changing your search terms.'
              : 'Completed downloads will appear here with quick access to files and folders.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-2xl p-4 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              {/* Item Info */}
              <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-16 h-11 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-11 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center flex-shrink-0 text-slate-600">
                    <Film className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4
                    className="text-sm font-bold text-white truncate group-hover:text-rose-300 transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                    {item.resolution === 'AUDIO_ONLY' || item.container === 'MP3' || item.container === 'M4A' ? (
                      <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500/15 to-rose-500/15 text-amber-300 border border-amber-500/30 font-bold uppercase text-[10px] flex items-center space-x-1">
                        <Music className="w-3 h-3 text-amber-400" />
                        <span>{item.container} Audio</span>
                      </span>
                    ) : (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold uppercase text-[10px]">
                          {item.resolution}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold uppercase text-[10px]">
                          {item.container}
                        </span>
                      </>
                    )}
                    <span className="text-slate-500">•</span>
                    <span className="flex items-center space-x-1 text-slate-400">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{item.date}</span>
                    </span>
                  </div>
                  {item.outputPath && (
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-1">
                      {item.outputPath}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenFile(item.outputPath)}
                  className="p-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition-colors"
                  title="Play video file"
                >
                  <Play className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenFolder(item.outputPath)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Open in File Explorer"
                >
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-750 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
