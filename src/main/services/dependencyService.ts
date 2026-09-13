import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { DependencyStatus, SingleDependencyStatus } from '../../shared/types';
import { storageService } from './storageService';

export class DependencyService {
  private getBundledPath(binaryName: string): string | null {
    const exeName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
    const candidates = [
      path.join(app.getAppPath(), 'resources', 'bin', exeName),
      path.join(process.resourcesPath, 'bin', exeName),
      path.join(process.resourcesPath, exeName),
      path.join(__dirname, '..', '..', 'resources', 'bin', exeName),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  private async verifyExecutable(
    execPath: string,
    args: string[] = ['--version']
  ): Promise<{ valid: boolean; version?: string }> {
    return new Promise((resolve) => {
      try {
        const proc = spawn(execPath, args, {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let output = '';

        proc.stdout?.on('data', (data) => {
          output += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          output += data.toString();
        });

        proc.on('error', () => {
          resolve({ valid: false });
        });

        proc.on('close', (code) => {
          if (code === 0 || output.length > 0) {
            // Extract the first line or version number
            const firstLine = output.trim().split('\n')[0] || '';
            const versionMatch = firstLine.match(/(\d+(\.\d+)+[a-zA-Z0-9._-]*)/);
            const version = versionMatch ? versionMatch[0] : firstLine.slice(0, 30);
            resolve({ valid: true, version: version || 'Installed' });
          } else {
            resolve({ valid: false });
          }
        });

        setTimeout(() => {
          try {
            proc.kill();
          } catch {
            // ignore
          }
          resolve({ valid: false });
        }, 5000);
      } catch {
        resolve({ valid: false });
      }
    });
  }

  private async checkBinary(
    binaryName: string,
    customPath: string,
    versionArgs: string[] = ['--version']
  ): Promise<SingleDependencyStatus> {
    let result: SingleDependencyStatus = {
      found: false,
      path: '',
      source: 'none',
    };

    // 1. Check Bundled
    const bundledPath = this.getBundledPath(binaryName);
    if (bundledPath) {
      const verify = await this.verifyExecutable(bundledPath, versionArgs);
      if (verify.valid) {
        result = {
          found: true,
          path: bundledPath,
          version: verify.version,
          source: 'bundled',
        };
      }
    }

    // 2. Check Custom configured path
    if (!result.found && customPath && customPath.trim() !== '') {
      if (fs.existsSync(customPath)) {
        const verify = await this.verifyExecutable(customPath, versionArgs);
        if (verify.valid) {
          result = {
            found: true,
            path: customPath,
            version: verify.version,
            source: 'custom',
          };
        }
      }
    }

    // 3. Check System PATH
    if (!result.found) {
      const systemExe = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
      const verifySystem = await this.verifyExecutable(systemExe, versionArgs);
      if (verifySystem.valid) {
        result = {
          found: true,
          path: systemExe,
          version: verifySystem.version,
          source: 'system',
        };
      }
    }

    // Version sanity check for yt-dlp
    if (result.found && binaryName === 'yt-dlp' && result.version) {
      const dateMatch = result.version.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        if (year < 2024 || (year === 2024 && month < 10)) {
          result.isOutdated = true;
          result.versionWarning = 'Outdated yt-dlp release. Click Update yt-dlp for latest YouTube stream compatibility.';
        }
      }
    }

    return result;
  }

  public async checkAllDependencies(): Promise<DependencyStatus> {
    const settings = storageService.getSettings();

    const [ytdlp, ffmpeg, ffprobe] = await Promise.all([
      this.checkBinary('yt-dlp', settings.customYtDlpPath, ['--version']),
      this.checkBinary('ffmpeg', settings.customFfmpegPath, ['-version']),
      this.checkBinary('ffprobe', settings.customFfprobePath, ['-version']),
    ]);

    const allReady = ytdlp.found && ffmpeg.found;

    return {
      ytdlp,
      ffmpeg,
      ffprobe,
      allReady,
    };
  }

  public async getYtDlpPath(): Promise<string> {
    const status = await this.checkBinary('yt-dlp', storageService.getSettings().customYtDlpPath, ['--version']);
    if (!status.found) {
      throw new Error('yt-dlp was not found. Open Settings to configure or install yt-dlp.');
    }
    return status.path;
  }

  public async getFfmpegPath(): Promise<string | null> {
    const status = await this.checkBinary('ffmpeg', storageService.getSettings().customFfmpegPath, ['-version']);
    return status.found ? status.path : null;
  }
}

export const dependencyService = new DependencyService();
