import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  VideoMetadata,
  VideoFormat,
  ResolutionOption,
  QualityPreset,
  ContainerOption,
  AudioQualityOption,
  DownloadProgress,
  DownloadRequest,
  ExtractionResult,
  SupportedBrowser,
} from '../../shared/types';
import { dependencyService } from './dependencyService';
import { storageService } from './storageService';

export class YtDlpService {
  private activeProcesses: Map<string, ChildProcess> = new Map();

  /**
   * Validate and sanitize YouTube and generic media URLs to prevent shell injection.
   */
  public isValidUrl(inputUrl: string): boolean {
    if (!inputUrl || typeof inputUrl !== 'string') return false;
    const trimmed = inputUrl.trim();
    if (trimmed.length > 2048) return false;

    // Check basic URL format
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Format duration in seconds to HH:MM:SS or MM:SS
   */
  private formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  /**
   * Fetch video or playlist information via yt-dlp JSON dump
  /**
   * Fetch video or playlist information via yt-dlp JSON dump with status analysis
   */
  public async getVideoInfo(
    rawUrl: string,
    browserOverride?: SupportedBrowser
  ): Promise<ExtractionResult> {
    if (!this.isValidUrl(rawUrl)) {
      return {
        status: 'FAILED',
        message: 'Please enter a valid HTTP or HTTPS video URL.',
      };
    }

    const ytdlpPath = await dependencyService.getYtDlpPath();
    const settings = storageService.getSettings();
    const url = rawUrl.trim();

    const isPurePlaylistUrl =
      /youtube\.com\/playlist\?/i.test(url) ||
      (url.includes('list=') && !url.includes('v=') && !url.includes('watch'));

    const effectiveBrowser = browserOverride || settings.browserForCookies;

    const baseArgs = [
      '--dump-single-json',
      isPurePlaylistUrl ? '--flat-playlist' : '--no-playlist',
      '--no-warnings',
      '--skip-download',
      '--no-check-certificates',
    ];

    if (effectiveBrowser && effectiveBrowser !== 'none') {
      baseArgs.push('--cookies-from-browser', effectiveBrowser);
    }

    baseArgs.push(url);

    const executeAnalysis = (): Promise<{ code: number | null; stdout: string; stderr: string }> => {
      return new Promise((resolve) => {
        const proc = spawn(ytdlpPath, baseArgs, {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (chunk) => {
          stdout += chunk.toString();
        });

        proc.stderr?.on('data', (chunk) => {
          stderr += chunk.toString();
        });

        proc.on('error', (err) => {
          resolve({ code: 1, stdout, stderr: err.message });
        });

        proc.on('close', (code) => {
          resolve({ code, stdout, stderr });
        });
      });
    };

    let result = await executeAnalysis();

    // If transient network error, retry once
    if (result.code !== 0 && !result.stderr.includes('429') && !result.stderr.includes('bot') && !result.stderr.includes('Sign in')) {
      await new Promise((r) => setTimeout(r, 1500));
      result = await executeAnalysis();
    }

    const stderrLower = result.stderr.toLowerCase();

    // Check specific YouTube failure reasons
    if (stderrLower.includes('429') || stderrLower.includes('too many requests')) {
      return {
        status: 'RATE_LIMITED',
        message: 'YouTube is currently rate-limiting requests (HTTP 429: Too Many Requests).',
        canUseBrowserSession: true,
      };
    }

    if (
      stderrLower.includes('sign in to confirm') ||
      stderrLower.includes('bot') ||
      stderrLower.includes('visitor data') ||
      stderrLower.includes('po token') ||
      stderrLower.includes('gvs po token')
    ) {
      return {
        status: 'BOT_CHECK',
        message: 'YouTube is requesting session verification (Bot Check / PO-Token). Use your local browser session (e.g. Chrome / Edge) to bypass this.',
        canUseBrowserSession: true,
        requiresUpdate: true,
      };
    }

    if (stderrLower.includes('private video') || stderrLower.includes('members-only')) {
      return {
        status: 'AUTH_REQUIRED',
        message: 'This video is private or requires channel membership sign-in.',
        canUseBrowserSession: true,
      };
    }

    if (result.code !== 0 || !result.stdout.trim()) {
      return {
        status: 'FAILED',
        message:
          result.stderr.trim().split('\n').filter((l) => !l.startsWith('WARNING:')).slice(-2).join(' ') ||
          'Unable to extract video information from YouTube.',
        canUseBrowserSession: true,
      };
    }

    try {
      const raw = JSON.parse(result.stdout.trim());

      // Check if this is a playlist
      const isPlaylist = raw._type === 'playlist' || Array.isArray(raw.entries);

      if (isPlaylist && Array.isArray(raw.entries)) {
        const playlistEntries = raw.entries.map((entry: any) => ({
          id: entry.id || '',
          title: entry.title || 'Untitled Video',
          duration: typeof entry.duration === 'number' ? entry.duration : 0,
          durationString: typeof entry.duration === 'number' ? this.formatDuration(entry.duration) : '--:--',
          url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
          thumbnail:
            entry.thumbnails && entry.thumbnails.length > 0
              ? entry.thumbnails[entry.thumbnails.length - 1].url
              : '',
        }));

        const firstThumb =
          raw.thumbnail ||
          (raw.thumbnails && raw.thumbnails.length > 0 ? raw.thumbnails[raw.thumbnails.length - 1].url : '') ||
          (playlistEntries.length > 0 ? playlistEntries[0].thumbnail : '');

        const metadata: VideoMetadata = {
          id: raw.id || 'playlist',
          title: raw.title || 'YouTube Playlist',
          uploader: raw.uploader || raw.channel || 'Playlist Creator',
          uploaderUrl: raw.uploader_url || raw.channel_url,
          duration: playlistEntries.reduce((acc: number, cur: any) => acc + (cur.duration || 0), 0),
          durationString: `${playlistEntries.length} Videos`,
          thumbnail: firstThumb,
          webpage_url: raw.webpage_url || url,
          viewCount: raw.view_count,
          description: raw.description ? raw.description.slice(0, 300) : `Playlist containing ${playlistEntries.length} videos.`,
          availableResolutions: [2160, 1440, 1080, 720, 480, 360],
          resolutionOptions: [2160, 1440, 1080, 720, 480, 360].map((res) => ({
            resolution: res,
            label: `${res}p`,
            isDownloadable: true,
            hasMp4Direct: true,
            note: 'Playlist Stream',
          })),
          maxDownloadableResolution: 2160,
          formats: [],
          isPlaylist: true,
          playlistCount: playlistEntries.length,
          playlistVideos: playlistEntries,
        };

        return {
          status: 'SUCCESS',
          metadata,
        };
      }

      // Single video: parse formats and available resolutions
      const formatsList: VideoFormat[] = [];
      const resolutionsSet = new Set<number>();

      if (Array.isArray(raw.formats)) {
        for (const f of raw.formats) {
          const hasVideo = (f.vcodec && f.vcodec !== 'none') || (!f.vcodec && f.video_ext && f.video_ext !== 'none');
          const hasAudio = (f.acodec && f.acodec !== 'none') || (!f.acodec && f.audio_ext && f.audio_ext !== 'none');

          let height = typeof f.height === 'number' && f.height > 0 ? f.height : undefined;
          let width = typeof f.width === 'number' && f.width > 0 ? f.width : undefined;

          if (!height && f.resolution) {
            const match = f.resolution.match(/(\d+)x(\d+)/);
            if (match) {
              width = parseInt(match[1], 10);
              height = parseInt(match[2], 10);
            } else {
              const pMatch = f.resolution.match(/(\d+)p/);
              if (pMatch) height = parseInt(pMatch[1], 10);
            }
          }

          if (!height && f.format_note) {
            const pMatch = f.format_note.match(/(\d+)p/);
            if (pMatch) height = parseInt(pMatch[1], 10);
          }

          if (hasVideo && height && height > 0) {
            resolutionsSet.add(height);
          }

          formatsList.push({
            formatId: f.format_id || '',
            ext: f.ext || 'mp4',
            resolution: f.resolution || (height ? `${height}p` : 'audio only'),
            width,
            height,
            fps: f.fps,
            vcodec: f.vcodec,
            acodec: f.acodec,
            filesize: f.filesize,
            filesizeApprox: f.filesize_approx,
            bitrate: f.tbr || f.vbr || f.abr,
            hasVideo: !!hasVideo,
            hasAudio: !!hasAudio,
          });
        }
      }

      // If YouTube only returned 1 format or incomplete formats due to SABR throttling without browser cookies
      if (formatsList.length <= 1 && !resolutionsSet.has(720) && !resolutionsSet.has(1080)) {
        // Mark as PARTIAL or BOT_CHECK so user is notified that higher qualities are available via browser session
        const metadata: VideoMetadata = {
          id: raw.id || '',
          title: raw.title || 'Untitled Video',
          uploader: raw.uploader || raw.channel || 'Unknown Creator',
          uploaderUrl: raw.uploader_url || raw.channel_url,
          duration: typeof raw.duration === 'number' ? raw.duration : 0,
          durationString: raw.duration_string || this.formatDuration(raw.duration || 0),
          thumbnail: raw.thumbnail || '',
          webpage_url: raw.webpage_url || url,
          viewCount: raw.view_count,
          uploadDate: raw.upload_date,
          description: raw.description ? raw.description.slice(0, 300) : '',
          availableResolutions: Array.from(resolutionsSet),
          resolutionOptions: Array.from(resolutionsSet).map((res) => ({
            resolution: res,
            label: `${res}p`,
            isDownloadable: true,
            hasMp4Direct: true,
            note: 'Restricted Stream (Sign-in / Browser Session recommended)',
          })),
          maxDownloadableResolution: Array.from(resolutionsSet)[0] || 360,
          formats: formatsList,
          isPlaylist: false,
        };

        return {
          status: 'PARTIAL',
          message: 'YouTube served restricted low-res streams. Enable your local Browser Session (Chrome/Edge/Firefox) in settings or below to unlock 1080p/4K.',
          metadata,
          canUseBrowserSession: true,
        };
      }

      // Build structured resolution tier options
      const standardTiers: { res: number; label: string }[] = [
        { res: 2160, label: '4K Ultra HD (2160p)' },
        { res: 1440, label: '2K Quad HD (1440p)' },
        { res: 1080, label: 'Full HD (1080p)' },
        { res: 720, label: 'HD (720p)' },
        { res: 480, label: 'Standard (480p)' },
        { res: 360, label: 'Low (360p)' },
      ];

      const resolutionOptions: ResolutionOption[] = [];
      let maxDownloadable = 0;

      for (const tier of standardTiers) {
        const matchingFormats = formatsList.filter(
          (f) => f.hasVideo && f.height && Math.abs(f.height - tier.res) <= 40
        );

        if (matchingFormats.length > 0) {
          if (tier.res > maxDownloadable) {
            maxDownloadable = tier.res;
          }
          const mp4Stream = matchingFormats.find(
            (f) => f.ext === 'mp4' || (f.vcodec && (f.vcodec.startsWith('avc1') || f.vcodec.startsWith('mp4v')))
          );
          const bestFormat = mp4Stream || matchingFormats[0];

          let codecLabel = 'H.264';
          if (bestFormat.vcodec?.startsWith('vp09') || bestFormat.vcodec?.startsWith('vp9')) codecLabel = 'VP9';
          else if (bestFormat.vcodec?.startsWith('av01')) codecLabel = 'AV1';
          else if (bestFormat.vcodec?.startsWith('avc1')) codecLabel = 'H.264 / AVC';

          resolutionOptions.push({
            resolution: tier.res,
            label: tier.label,
            isDownloadable: true,
            hasMp4Direct: !!mp4Stream,
            videoCodec: codecLabel,
            fps: bestFormat.fps || 30,
            note: mp4Stream ? 'Direct MP4 Stream' : 'High Quality Stream (Remuxable to MP4/MKV)',
          });
        } else {
          resolutionOptions.push({
            resolution: tier.res,
            label: tier.label,
            isDownloadable: false,
            hasMp4Direct: false,
            note: 'Not available from YouTube source',
          });
        }
      }

      const availableResolutions = Array.from(resolutionsSet).sort((a, b) => b - a);
      if (maxDownloadable === 0 && availableResolutions.length > 0) {
        maxDownloadable = availableResolutions[0];
      }

      const duration = typeof raw.duration === 'number' ? raw.duration : 0;
      const durationString = raw.duration_string || this.formatDuration(duration);

      const metadata: VideoMetadata = {
        id: raw.id || '',
        title: raw.title || 'Untitled Video',
        uploader: raw.uploader || raw.channel || 'Unknown Creator',
        uploaderUrl: raw.uploader_url || raw.channel_url,
        duration,
        durationString,
        thumbnail:
          raw.thumbnail ||
          (Array.isArray(raw.thumbnails) && raw.thumbnails.length > 0
            ? raw.thumbnails[raw.thumbnails.length - 1].url
            : ''),
        webpage_url: raw.webpage_url || url,
        viewCount: raw.view_count,
        uploadDate: raw.upload_date,
        description: raw.description ? raw.description.slice(0, 300) : '',
        availableResolutions: availableResolutions.length > 0 ? availableResolutions : [1080, 720, 480, 360],
        resolutionOptions,
        maxDownloadableResolution: maxDownloadable > 0 ? maxDownloadable : 1080,
        formats: formatsList,
        isPlaylist: false,
      };

      return {
        status: 'SUCCESS',
        metadata,
      };
    } catch (parseErr) {
      return {
        status: 'FAILED',
        message: 'Failed to parse video metadata response from yt-dlp.',
      };
    }
  }

  /**
   * Build dynamic yt-dlp format selector with intelligent progressive fallback.
   * NEVER prefers a combined low-res stream over high-res video-only + audio-only stream.
   * Uses bv*+ba/b syntax to ensure separate DASH streams are prioritized and merged by FFmpeg.
   */
  public buildFormatSelector(
    quality: QualityPreset,
    container: ContainerOption
  ): string {
    if (quality === 'audio_only' || container === 'mp3' || container === 'm4a') {
      if (container === 'm4a') {
        return 'ba[ext=m4a]/ba/bestaudio/b';
      }
      return 'bestaudio/best';
    }

    if (quality === 'best') {
      if (container === 'mp4') {
        // Prefer best MP4 video + best M4A audio, then any best video + best audio, fallback to best combined
        return 'bv*[ext=mp4]+ba[ext=m4a]/bv*[ext=mp4]+ba/bv*+ba[ext=m4a]/bv*+ba/b';
      }
      // For MKV/WEBM or other containers, select highest quality video + highest quality audio
      return 'bv*+ba/b';
    }

    const heightMatch = quality.match(/^(\d+)p$/);
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 1080;

    if (container === 'mp4') {
      // Dynamic selector: best video <= requested height (preferring MP4 container/AVC/AV1) + best M4A/AAC audio
      // Separate video + audio streams are given priority over legacy combined formats
      return `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/bv*[height<=${height}][ext=mp4]+ba/bv*[height<=${height}]+ba[ext=m4a]/bv*[height<=${height}]+ba/b[height<=${height}]/bv*+ba/b`;
    }

    return `bv*[height<=${height}]+ba/b[height<=${height}]/bv*+ba/b`;
  }

  /**
   * Evaluate and rank available formats dynamically, logging detailed developer inspection output.
   */
  public logSelectedFormatDetails(
    url: string,
    quality: QualityPreset,
    container: ContainerOption,
    formatSelector: string
  ): void {
    console.log('\n==================== [FORMAT SELECTION DEBUG] ====================');
    console.log(`URL: ${url}`);
    console.log(`Requested Quality Preset: ${quality}`);
    console.log(`Target Container: ${container.toUpperCase()}`);
    console.log(`Generated yt-dlp Selector: "${formatSelector}"`);
    console.log(`Selection Strategy:`);
    if (quality === 'audio_only' || container === 'mp3' || container === 'm4a') {
      console.log(`  - Mode: Audio-Only Extraction`);
      console.log(`  - Target: Highest quality audio stream (${container})`);
    } else {
      console.log(`  - Mode: Video + Audio Stream Combination`);
      console.log(`  - Video Priority: Best video stream with height <= ${quality === 'best' ? 'Max' : quality} (preferring ${container.toUpperCase()})`);
      console.log(`  - Audio Priority: Best compatible audio stream (preferring M4A/AAC for MP4)`);
      console.log(`  - Merger: Local FFmpeg will merge separate streams into .${container}`);
      console.log(`  - Fallback Rule: Separate video-only + audio-only strictly preferred over low-res combined`);
    }
    console.log('==================================================================\n');
  }

  /**
   * Start downloading video with real-time progress parsing
   */
  public async startDownload(
    downloadId: string,
    request: DownloadRequest,
    onProgress: (progress: DownloadProgress) => void,
    onComplete: (outputPath: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const ytdlpPath = await dependencyService.getYtDlpPath();
    const ffmpegPath = await dependencyService.getFfmpegPath();
    const settings = storageService.getSettings();

    const outputFolder = request.downloadPath || settings.defaultDownloadPath;
    if (!fs.existsSync(outputFolder)) {
      try {
        fs.mkdirSync(outputFolder, { recursive: true });
      } catch (err) {
        return onError(`Cannot create download directory: ${outputFolder}`);
      }
    }

    const isAudioOnly = request.quality === 'audio_only' || request.container === 'mp3' || request.container === 'm4a';
    const isPlaylist = !!request.isPlaylist;

    const outputTemplate = isPlaylist
      ? path.join(outputFolder, '%(playlist_title|Playlist)s', '%(playlist_index|0)02d - %(title)s [%(id)s].%(ext)s')
      : path.join(outputFolder, '%(title)s [%(id)s].%(ext)s');

    const formatSelector = this.buildFormatSelector(request.quality, request.container);

    // Output developer debugging logs
    this.logSelectedFormatDetails(request.url, request.quality, request.container, formatSelector);

    const args: string[] = [
      isPlaylist ? '--yes-playlist' : '--no-playlist',
      '--no-warnings',
      '--newline',
      '-f', formatSelector,
      '-o', outputTemplate,
    ];

    if (settings.browserForCookies && settings.browserForCookies !== 'none') {
      args.push('--cookies-from-browser', settings.browserForCookies);
    }

    if (ffmpegPath && path.isAbsolute(ffmpegPath)) {
      try {
        const stat = fs.statSync(ffmpegPath);
        args.push('--ffmpeg-location', stat.isDirectory() ? ffmpegPath : path.dirname(ffmpegPath));
      } catch {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }
    }

    // Container handling
    if (isAudioOnly) {
      args.push('-x');
      args.push('--audio-format', request.container === 'mp3' ? 'mp3' : 'm4a');
      const qualityMap: Record<AudioQualityOption, string> = {
        best: '0',
        '320k': '320k',
        '256k': '256k',
        '192k': '192k',
        '128k': '128k',
      };
      args.push('--audio-quality', qualityMap[request.audioQuality] || '0');
    } else {
      args.push('--merge-output-format', request.container);
    }

    // Custom user arguments from settings if configured
    if (settings.customYtDlpArgs && settings.customYtDlpArgs.trim() !== '') {
      const extraArgs = settings.customYtDlpArgs.trim().split(/\s+/);
      args.push(...extraArgs);
    }

    // URL is always the last argument
    args.push(request.url);

    let downloadedFile = '';
    let lastError = '';
    let currentPlaylistIndex = 1;
    let playlistTotal = request.playlistCount || 1;
    let currentItemTitle = '';

    const proc = spawn(ytdlpPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.activeProcesses.set(downloadId, proc);

    proc.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        // Detect playlist item transition: "[download] Downloading item 3 of 15" or "[download] Downloading video 3 of 15"
        const playlistItemMatch = cleanLine.match(/\[download\] Downloading (?:item|video)\s+(\d+)\s+of\s+(\d+)/i);
        if (playlistItemMatch) {
          currentPlaylistIndex = parseInt(playlistItemMatch[1], 10);
          playlistTotal = parseInt(playlistItemMatch[2], 10);
        }

        // Detect destination filename / title
        const destMatch = cleanLine.match(/\[(?:download|Merger|ExtractAudio|ffmpeg|Fixup[a-zA-Z0-9]+)\] Destination:\s*(.+)$/i);
        if (destMatch && destMatch[1]) {
          downloadedFile = destMatch[1].trim();
          currentItemTitle = path.basename(downloadedFile);
        }

        const audioNotConvertingMatch = cleanLine.match(/\[ExtractAudio\] Not converting audio\s+(.+?)\s+because/i);
        if (audioNotConvertingMatch && audioNotConvertingMatch[1]) {
          downloadedFile = audioNotConvertingMatch[1].trim();
          currentItemTitle = path.basename(downloadedFile);
        }

        const mergedMatch = cleanLine.match(/\[Merger\] Merging formats into "(.+)"/i);
        if (mergedMatch && mergedMatch[1]) {
          downloadedFile = mergedMatch[1].trim();
        }

        const alreadyDownloadedMatch = cleanLine.match(/\[download\]\s*(.+?)\s*has already been downloaded/i);
        if (alreadyDownloadedMatch && alreadyDownloadedMatch[1]) {
          downloadedFile = alreadyDownloadedMatch[1].trim();
        }

        // Parsing progress output: "[download]  45.2% of ~ 150.00MiB at  4.50MiB/s ETA 00:18"
        if (cleanLine.includes('[download]') && cleanLine.includes('%')) {
          const percentMatch = cleanLine.match(/(\d+(?:\.\d+)?)%/);
          const speedMatch = cleanLine.match(/at\s+([^\s]+(?:iB|B)\/s)/i);
          const etaMatch = cleanLine.match(/ETA\s+([0-9:]+)/i);
          const sizeMatch = cleanLine.match(/of\s+(?:~\s*)?([^\s]+(?:iB|B|MB|GB))/i);

          const itemPercent = percentMatch ? parseFloat(percentMatch[1]) : 0;
          const speed = speedMatch ? speedMatch[1] : '--';
          const eta = etaMatch ? etaMatch[1] : '--';
          const totalStr = sizeMatch ? sizeMatch[1] : '';

          let overallProgress = itemPercent;
          let statusText = `Downloading: ${itemPercent.toFixed(1)}% ${totalStr ? `of ${totalStr}` : ''}`;

          if (isPlaylist && playlistTotal > 0) {
            overallProgress = ((currentPlaylistIndex - 1) / playlistTotal) * 100 + itemPercent / playlistTotal;
            statusText = `[${currentPlaylistIndex}/${playlistTotal}] ${currentItemTitle || 'Item'}: ${itemPercent.toFixed(1)}%`;
          }

          onProgress({
            downloadId,
            status: 'downloading',
            progress: overallProgress,
            speed,
            downloadedBytes: 0,
            totalBytes: 0,
            eta,
            statusText,
            isPlaylist,
            playlistCurrentIndex: currentPlaylistIndex,
            playlistTotal,
            currentItemTitle,
          });
        } else if (cleanLine.includes('[Merger]') || cleanLine.includes('[ExtractAudio]')) {
          onProgress({
            downloadId,
            status: 'merging',
            progress: isPlaylist ? Math.max(90, ((currentPlaylistIndex) / playlistTotal) * 100) : 99,
            speed: 'Merging streams',
            downloadedBytes: 0,
            totalBytes: 0,
            eta: '00:00',
            statusText: isPlaylist
              ? `[${currentPlaylistIndex}/${playlistTotal}] Merging formats with FFmpeg...`
              : 'Merging video and audio with FFmpeg...',
            isPlaylist,
            playlistCurrentIndex: currentPlaylistIndex,
            playlistTotal,
          });
        }
      }
    });

    proc.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      lastError += text;
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(downloadId);
      onError(`Process error: ${err.message}`);
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(downloadId);

      if (code === 0) {
        let finalOutputPath = downloadedFile || outputFolder;

        // If audio-only conversion was requested, ensure the path points to the resulting audio file (.mp3 / .m4a)
        if (isAudioOnly && downloadedFile) {
          const targetExt = request.container === 'm4a' ? '.m4a' : '.mp3';
          if (!downloadedFile.toLowerCase().endsWith(targetExt)) {
            const parsedPath = path.parse(downloadedFile);
            const candidate = path.join(parsedPath.dir, `${parsedPath.name}${targetExt}`);
            if (fs.existsSync(candidate)) {
              finalOutputPath = candidate;
            }
          }
        }

        onProgress({
          downloadId,
          status: 'completed',
          progress: 100,
          speed: 'Done',
          downloadedBytes: 0,
          totalBytes: 0,
          eta: '00:00',
          statusText: isPlaylist
            ? `All ${playlistTotal} playlist items downloaded successfully!`
            : isAudioOnly
            ? 'MP3 audio extracted and downloaded successfully.'
            : 'Download completed successfully.',
          isPlaylist,
          playlistCurrentIndex: playlistTotal,
          playlistTotal,
        });
        onComplete(finalOutputPath);
      } else {
        const errLower = lastError.toLowerCase();
        let userFriendlyError = 'Download failed. Please try again.';

        if (errLower.includes('requested format is not available')) {
          userFriendlyError = 'That quality is currently unavailable for this video. Try another resolution or choose Best Available.';
        } else if (errLower.includes('ffmpeg') && errLower.includes('not found')) {
          userFriendlyError = 'FFmpeg was not found. Please configure FFmpeg in Settings to merge streams.';
        } else if (errLower.includes('permission denied')) {
          userFriendlyError = 'Permission denied writing to the selected folder. Please choose a different download location.';
        } else if (errLower.includes('no space left on device') || errLower.includes('disk full')) {
          userFriendlyError = 'Insufficient disk space on the selected drive.';
        } else if (lastError.trim()) {
          userFriendlyError = lastError.trim().split('\n').filter(l => !l.startsWith('WARNING:')).slice(-2).join(' ') || 'Download process terminated unexpectedly.';
        }

        onError(userFriendlyError);
      }
    });
  }

  /**
   * Cancel an active download by downloadId
   */
  public cancelDownload(downloadId: string): boolean {
    const proc = this.activeProcesses.get(downloadId);
    if (proc) {
      try {
        if (process.platform === 'win32' && proc.pid) {
          spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F']);
        } else {
          proc.kill('SIGTERM');
        }
      } catch (err) {
        console.error('Failed to kill child process:', err);
      }
      this.activeProcesses.delete(downloadId);
      return true;
    }
    return false;
  }

  /**
   * Update yt-dlp executable
   */
  public async updateYtDlp(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const ytdlpPath = await dependencyService.getYtDlpPath();
      return new Promise((resolve) => {
        const proc = spawn(ytdlpPath, ['-U'], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let output = '';
        proc.stdout?.on('data', (d) => (output += d.toString()));
        proc.stderr?.on('data', (d) => (output += d.toString()));

        proc.on('close', async (code) => {
          if (code === 0) {
            const deps = await dependencyService.checkAllDependencies();
            resolve({
              success: true,
              message: output.trim() || 'yt-dlp updated successfully.',
              version: deps.ytdlp.version,
            });
          } else {
            resolve({
              success: false,
              message: output.trim() || 'Failed to update yt-dlp.',
            });
          }
        });
      });
    } catch (err: any) {
      return { success: false, message: err.message || 'yt-dlp is not available to update.' };
    }
  }

  /**
   * Clean up all running child processes when Electron shuts down
   */
  public cleanupAll(): void {
    for (const [id, proc] of this.activeProcesses.entries()) {
      try {
        if (process.platform === 'win32' && proc.pid) {
          spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F']);
        } else {
          proc.kill('SIGKILL');
        }
      } catch {
        // ignore
      }
    }
    this.activeProcesses.clear();
  }
}

export const ytDlpService = new YtDlpService();
