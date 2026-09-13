import React, { useState } from 'react';
import { Link2, Clipboard, Search, Loader2, X, Sparkles } from 'lucide-react';

interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  url,
  setUrl,
  onAnalyze,
  isLoading,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      onAnalyze();
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative flex items-center bg-darkbg-800 rounded-2xl border transition-all duration-300 p-1.5 shadow-xl ${
          isFocused
            ? 'border-rose-500/60 ring-2 ring-rose-500/20 shadow-rose-500/10'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Left Link Icon */}
        <div className="pl-3.5 pr-2 text-slate-500 flex items-center">
          <Link2 className="w-5 h-5 text-rose-500/80" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Paste YouTube or video link here (e.g. https://www.youtube.com/watch?v=...)"
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none py-2.5 px-2 font-medium"
          disabled={isLoading}
        />

        {/* Action buttons inside input */}
        <div className="flex items-center space-x-1.5 pr-1.5">
          {url ? (
            <button
              onClick={() => setUrl('')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              title="Clear input"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePaste}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all shadow-sm"
              title="Paste from clipboard"
              type="button"
            >
              <Clipboard className="w-3.5 h-3.5 text-rose-400" />
              <span>Paste</span>
            </button>
          )}

          {/* Analyze CTA button */}
          <button
            onClick={onAnalyze}
            disabled={!url.trim() || isLoading}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-all duration-200 ${
              !url.trim() || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-600/30 hover:shadow-rose-600/40 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
