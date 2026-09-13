# LocalTube Downloader

Made this on a random Sunday night because I wanted to download a YouTube playlist in the best available quality.

I found `yt-dlp`, got it working, and then realized I had to keep remembering terminal commands, format selectors, FFmpeg commands, etc.

So instead of remembering all that, I made a small desktop app for it.

Paste the URL → check the available quality → choose what you want → download.

The app uses **yt-dlp** for downloading and **FFmpeg** for merging video and audio when they're provided as separate streams.

That's pretty much it.

I needed it, so I built it.

---

## ⚡ Prerequisites

To run and download videos, make sure you have **yt-dlp** and **FFmpeg**:

- **Option 1 (Recommended)**: Install via `winget`:
  ```powershell
  winget install yt-dlp.yt-dlp
  winget install Gyan.FFmpeg
  ```
- **Option 2**: Place `yt-dlp.exe`, `ffmpeg.exe`, and `ffprobe.exe` directly inside the `resources/bin/` folder.
- **Option 3**: Configure custom paths to your binaries in the app's **Settings** screen.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the App
```bash
npm start
```

*(For live UI development with hot-reload, run `npm run dev`)*

### 3. Build & Package (Windows)
```bash
# Compile production bundles
npm run build

# Create portable .exe and installer
npm run package
```

---

## 💡 Key Highlights

- **Dynamic Format Discovery**: Discovers all real video & audio streams (1080p, 1440p, 4K, 60fps) on the fly without hardcoded format IDs.
- **DASH Stream Merging**: Automatically combines high-resolution video-only streams with pristine audio streams via FFmpeg.
- **Single Videos & Full Playlists**: Paste any video or playlist URL to download individual files or entire batches with indexed numbering.
- **Custom Containers**: Export as `MP4`, `MKV`, `WEBM`, or extract audio as `MP3` and `M4A`.
- **100% Local & Private**: Runs completely on your device with zero cloud servers or data collection.
