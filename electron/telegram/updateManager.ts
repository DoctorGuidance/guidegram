import https from 'https'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { UpdateInfo, ProxyConfig } from './types'
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

      const updateInfo: UpdateInfo = {
        currentVersion: this.currentVersion,
        latestVersion: latestVer,
        releaseNotes: releaseData.body || 'No release notes provided.',
        downloadUrl,
        publishedAt: releaseData.published_at,
        hasUpdate,
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
   * Fetch latest release JSON from GitHub API (supports proxy fallback)
   */
  private async fetchLatestRelease(proxy?: ProxyConfig): Promise<any> {
    return new Promise((resolve) => {
      const makeRequest = () => {
        const options: https.RequestOptions = {
          hostname: 'api.github.com',
          path: `/repos/${this.repoOwner}/${this.repoName}/releases/latest`,
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
                resolve(JSON.parse(body))
              } catch (_) {
                resolve(null)
              }
            } else {
              resolve(null)
            }
          })
        })

        req.on('error', () => resolve(null))
        req.on('timeout', () => {
          req.destroy()
          resolve(null)
        })
        req.end()
      }

      makeRequest()
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
    dataDir: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      Logger.info(`[UpdateManager] Starting portable update download from: ${downloadUrl}`)
      const tempDir = path.join(dataDir, 'temp')
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      const zipPath = path.join(tempDir, 'update.zip')
      const downloaded = await this.downloadFile(downloadUrl, zipPath)
      if (!downloaded) {
        return { success: false, error: 'Failed to download update package.' }
      }

      // Create PowerShell update script
      const scriptPath = path.join(tempDir, 'apply_update.ps1')
      const exePath = app.getPath('exe')

      const psScript = `
Start-Sleep -Seconds 2
$tempDir = "${tempDir.replace(/\\/g, '\\\\')}"
$zipFile = "${zipPath.replace(/\\/g, '\\\\')}"
$targetDir = "${appInstallDir.replace(/\\/g, '\\\\')}"
$exe = "${exePath.replace(/\\/g, '\\\\')}"

try {
    # Extract archive into target folder without wiping data folder
    Expand-Archive -Path $zipFile -DestinationPath $targetDir -Force
    Remove-Item -Path $zipFile -Force -ErrorAction SilentlyContinue
} catch {
    Add-Content -Path (Join-Path $tempDir "update_error.log") -Value $_
}

# Relaunch updated Guidegram
Start-Process -FilePath $exe
`
      await fs.promises.writeFile(scriptPath, psScript, 'utf-8')
      Logger.info(`[UpdateManager] Update script generated at: ${scriptPath}`)

      // Spawn powershell detached process
      const { spawn } = await import('child_process')
      const child = spawn(
        'powershell.exe',
        ['-ExecutionPolicy', 'Bypass', '-File', scriptPath],
        {
          detached: true,
          stdio: 'ignore',
        }
      )
      child.unref()

      // Quit app immediately so files can be safely replaced
      setTimeout(() => {
        app.quit()
      }, 500)

      return { success: true }
    } catch (err: any) {
      Logger.error('[UpdateManager] Portable update failed:', err)
      return { success: false, error: err.message || 'Update error' }
    }
  }

  private downloadFile(url: string, destPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(destPath)
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

            res.pipe(file)
            file.on('finish', () => {
              file.close(() => resolve(true))
            })
          })
          .on('error', () => {
            file.close()
            fs.unlink(destPath, () => {})
            resolve(false)
          })
      }

      request(url)
    })
  }
}
