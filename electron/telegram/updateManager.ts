import https from 'https'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { UpdateInfo, UpdateProgress, ProxyConfig } from './types'
import { Logger } from './logger'

export class UpdateManager {
  private currentVersion: string
  private repoOwner = 'DoctorGuidance'
  private repoName = 'guidegram'
  private timer: NodeJS.Timeout | null = null

  constructor(currentVersion?: string) {
    this.currentVersion = currentVersion || app.getVersion() || '1.0.0'
  }

  /**
   * Check for latest release on GitHub
   */
  public async checkForUpdates(proxy?: ProxyConfig): Promise<UpdateInfo | null> {
    try {
      Logger.info(`[UpdateManager] Checking for updates (current: v${this.currentVersion})...`)
      const releaseData = await this.fetchLatestRelease(proxy)
      if (!releaseData) return null

      const tagName: string = releaseData.tag_name || ''
      const latestVer = tagName.replace(/^v/, '').trim()
      const hasUpdate = this.compareSemver(latestVer, this.currentVersion) > 0

      // Find Windows zip asset
      let downloadUrl: string | undefined
      if (Array.isArray(releaseData.assets)) {
        const zipAsset = releaseData.assets.find((a: any) =>
          a.name?.toLowerCase().endsWith('.zip')
        )
        if (zipAsset) {
          downloadUrl = zipAsset.browser_download_url
        }
      }

      // Security and Minor/Major version classification
      const notesLower = (releaseData.body || '').toLowerCase()
      const tagLower = tagName.toLowerCase()

      const hasSecurityKeyword =
        notesLower.includes('security') ||
        notesLower.includes('critical') ||
        notesLower.includes('mandatory') ||
        notesLower.includes('vulnerability') ||
        notesLower.includes('breaking') ||
        tagLower.includes('sec') ||
        tagLower.includes('crit')

      const curParts = this.currentVersion.split('.').map((n) => parseInt(n, 10) || 0)
      const latParts = latestVer.split('.').map((n) => parseInt(n, 10) || 0)
      const isMajorBump = latParts[0] > curParts[0]
      const isMinorBump = latParts[0] === curParts[0] && latParts[1] > curParts[1]

      // Security updates or major/minor version bumps (e.g. 5.6.0 or 5.6) require mandatory download
      const isMandatory = hasUpdate && (isMajorBump || isMinorBump || hasSecurityKeyword)
      const isSecurityUpdate = hasUpdate && hasSecurityKeyword
      const severity: 'critical' | 'normal' = isMandatory ? 'critical' : 'normal'

      const updateInfo: UpdateInfo = {
        currentVersion: this.currentVersion,
        latestVersion: latestVer,
        releaseNotes: releaseData.body || 'No release notes provided.',
        downloadUrl,
        publishedAt: releaseData.published_at,
        hasUpdate,
        isMandatory,
        isSecurityUpdate,
        severity,
      }

      Logger.info(
        `[UpdateManager] Update check completed. Latest: v${latestVer}, Has update: ${hasUpdate}`
      )
      return updateInfo
    } catch (err: any) {
      Logger.warn('[UpdateManager] Check for updates failed:', err)
      return null
    }
  }

  /**
   * Start hourly background updater
   */
  public startHourlyCheck(
    callback: (info: UpdateInfo) => void,
    getProxy?: () => ProxyConfig | undefined
  ): void {
    if (this.timer) clearInterval(this.timer)

    // Initial check after 15 seconds
    setTimeout(async () => {
      const info = await this.checkForUpdates(getProxy?.())
      if (info && info.hasUpdate) {
        callback(info)
      }
    }, 15000)

    // Check every 1 hour (3600000 ms)
    this.timer = setInterval(async () => {
      Logger.info('[UpdateManager] Running hourly update check...')
      const info = await this.checkForUpdates(getProxy?.())
      if (info && info.hasUpdate) {
        callback(info)
      }
    }, 3600000)
  }

  public stopHourlyCheck(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * Compare two semver strings: a > b -> 1, a < b -> -1, a == b -> 0
   */
  private compareSemver(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0
      const nb = pb[i] || 0
      if (na > nb) return 1
      if (na < nb) return -1
    }
    return 0
  }

  /**
   * Fetch latest release JSON from GitHub API (supports proxy fallback & semver sorting)
   */
  private async fetchLatestRelease(proxy?: ProxyConfig): Promise<any> {
    return new Promise((resolve) => {
      const makeRequest = (pathUrl: string, isFallback = false) => {
        const options: https.RequestOptions = {
          hostname: 'api.github.com',
          path: pathUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Guidegram-Desktop-App',
            Accept: 'application/vnd.github.v3+json',
          },
          timeout: 12000,
        }

        const req = https.request(options, (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(body)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  // Filter non-draft/non-prerelease and sort descending by semver
                  const stable = parsed.filter((r: any) => !r.draft && !r.prerelease)
                  stable.sort((a: any, b: any) => {
                    const verA = (a.tag_name || '').replace(/^v/, '').trim()
                    const verB = (b.tag_name || '').replace(/^v/, '').trim()
                    return this.compareSemver(verB, verA)
                  })
                  resolve(stable[0] || parsed[0])
                  return
                } else if (parsed && typeof parsed === 'object') {
                  resolve(parsed)
                  return
                }
              } catch (_) {
                // Ignore parse error and proceed to fallback
              }
            }

            if (!isFallback) {
              makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`, true)
            } else {
              resolve(null)
            }
          })
        })

        req.on('error', () => {
          if (!isFallback) {
            makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`, true)
          } else {
            resolve(null)
          }
        })

        req.on('timeout', () => {
          req.destroy()
          if (!isFallback) {
            makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`, true)
          } else {
            resolve(null)
          }
        })

        req.end()
      }

      makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases`)
    })
  }

  /**
   * Seamless Portable Update without Data Corruption
   * Downloads the update zip, writes a self-executing PowerShell helper, quits the app,
   * extracts files over application dir (excluding data/), and restarts Guidegram.
   */
  public async performPortableUpdate(
    downloadUrl: string,
    appInstallDir: string,
    dataDir: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      Logger.info(`[UpdateManager] Starting portable update download from: ${downloadUrl}`)
      const tempDir = path.join(dataDir, 'temp')
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      const zipPath = path.join(tempDir, 'update.zip')
      const downloaded = await this.downloadFile(downloadUrl, zipPath, onProgress)
      if (!downloaded) {
        return { success: false, error: 'Failed to download update package.' }
      }

      if (onProgress) {
        onProgress({
          percent: 100,
          transferredBytes: 0,
          totalBytes: 0,
          stage: 'extracting',
        })
      }

      // Create resilient PowerShell update script
      const scriptPath = path.join(tempDir, 'apply_update.ps1')
      const batPath = path.join(tempDir, 'apply_update.bat')
      const exePath = app.getPath('exe')

      const psScript = `
$tempDir = "${tempDir.replace(/\\/g, '\\\\')}"
$zipFile = "${zipPath.replace(/\\/g, '\\\\')}"
$targetDir = "${appInstallDir.replace(/\\/g, '\\\\')}"
$exe = "${exePath.replace(/\\/g, '\\\\')}"
$logFile = Join-Path $tempDir "update_process.log"

Add-Content -Path $logFile -Value "=========================================="
Add-Content -Path $logFile -Value "Starting Guidegram Portable Update at $(Get-Date)"
Add-Content -Path $logFile -Value "Target Directory: $targetDir"
Add-Content -Path $logFile -Value "Executable: $exe"

# 1. Wait for Guidegram processes to exit gracefully, force terminate after 5 seconds
$attempts = 0
while ($attempts -lt 20) {
    $procs = Get-Process | Where-Object {
        $_.ProcessName -like "*Guidegram*" -or ($_.Path -and $_.Path -eq $exe)
    } -ErrorAction SilentlyContinue

    if (-not $procs) {
        Add-Content -Path $logFile -Value "All Guidegram instances terminated successfully."
        break
    }

    if ($attempts -ge 4) {
        Add-Content -Path $logFile -Value "Terminating lingering Guidegram processes (attempt $attempts)..."
        $procs | Stop-Process -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Milliseconds 500
    $attempts++
}

# 2. Ensure Guidegram.exe is completely unlocked before extraction
$attempts = 0
while ($attempts -lt 15) {
    try {
        if (Test-Path $exe) {
            $stream = [System.IO.File]::Open($exe, 'Open', 'ReadWrite', 'None')
            if ($stream) {
                $stream.Close()
                $stream.Dispose()
                Add-Content -Path $logFile -Value "Guidegram.exe file handle is unlocked and ready for overwrite."
                break
            }
        } else {
            break
        }
    } catch {
        Add-Content -Path $logFile -Value "Waiting for file unlock ($attempts): $($_.Exception.Message)"
        Start-Sleep -Seconds 1
        $attempts++
    }
}

# 3. Extract updated files over target directory with per-file retry
try {
    Add-Content -Path $logFile -Value "Extracting $zipFile to $targetDir..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipFile)
    $extractedCount = 0

    foreach ($entry in $zip.Entries) {
        # Strictly preserve existing user data folder
        if ($entry.FullName -like "data/*" -or $entry.FullName -like "data\\*") {
            continue
        }

        $destPath = Join-Path $targetDir $entry.FullName
        $destDir = [System.IO.Path]::GetDirectoryName($destPath)

        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        if (-not [string]::IsNullOrEmpty($entry.Name)) {
            $extracted = $false
            $retry = 0
            while (-not $extracted -and $retry -lt 5) {
                try {
                    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destPath, $true)
                    $extracted = $true
                    $extractedCount++
                } catch {
                    Start-Sleep -Milliseconds 300
                    $retry++
                }
            }
            if (-not $extracted) {
                Add-Content -Path $logFile -Value "WARNING: Could not overwrite $($entry.FullName)"
            }
        }
    }
    $zip.Dispose()

    Add-Content -Path $logFile -Value "Extracted $extractedCount files successfully."
    Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
} catch {
    Add-Content -Path $logFile -Value "EXTRACTION ERROR: $($_.Exception.ToString())"
}

# 4. Relaunch updated Guidegram executable with correct working directory
Add-Content -Path $logFile -Value "Relaunching $exe with WorkingDirectory $targetDir"
Start-Process -FilePath $exe -WorkingDirectory $targetDir
`
      await fs.promises.writeFile(scriptPath, psScript, 'utf-8')

      // Create a batch launcher to cleanly break away from Chromium Job Object on Windows
      const batScript = `@echo off\r\nstart "" /b powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}"\r\n`
      await fs.promises.writeFile(batPath, batScript, 'utf-8')
      Logger.info(`[UpdateManager] Resilient update script and breakaway launcher generated at: ${scriptPath}`)

      if (onProgress) {
        onProgress({
          percent: 100,
          transferredBytes: 0,
          totalBytes: 0,
          stage: 'restarting',
        })
      }

      // Spawn detached cmd process that launches PowerShell outside Chromium Job Object
      const { spawn } = await import('child_process')
      const child = spawn(
        'cmd.exe',
        ['/c', 'start', '""', '/min', 'powershell.exe', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        }
      )
      child.unref()

      // Ensure tray is removed and all processes exit cleanly
      setTimeout(() => {
        app.exit(0)
      }, 600)

      return { success: true }
    } catch (err: any) {
      Logger.error('[UpdateManager] Portable update failed:', err)
      return { success: false, error: err.message || 'Update error' }
    }
  }

  private downloadFile(
    url: string,
    destPath: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(destPath)
      let transferredBytes = 0
      let totalBytes = 0

      const request = (targetUrl: string) => {
        https
          .get(targetUrl, { headers: { 'User-Agent': 'Guidegram-Desktop-App' } }, (res) => {
            // Handle redirects (GitHub release downloads redirect to AWS S3)
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              request(res.headers.location)
              return
            }

            if (res.statusCode !== 200) {
              file.close()
              fs.unlink(destPath, () => {})
              resolve(false)
              return
            }

            const headerLen = res.headers['content-length']
            if (headerLen) {
              totalBytes = parseInt(headerLen, 10) || 0
            }

            res.on('data', (chunk: Buffer) => {
              transferredBytes += chunk.length
              if (onProgress && totalBytes > 0) {
                const percent = Math.min(99, Math.round((transferredBytes / totalBytes) * 100))
                onProgress({
                  percent,
                  transferredBytes,
                  totalBytes,
                  stage: 'downloading',
                })
              }
            })

            res.pipe(file)
            file.on('finish', () => {
              file.close(() => {
                if (onProgress) {
                  onProgress({
                    percent: 100,
                    transferredBytes,
                    totalBytes: totalBytes || transferredBytes,
                    stage: 'extracting',
                  })
                }
                resolve(true)
              })
            })
          })
          .on('error', (err) => {
            Logger.error('[UpdateManager] Download file error:', err)
            file.close()
            fs.unlink(destPath, () => {})
            resolve(false)
          })
      }

      request(url)
    })
  }
}
