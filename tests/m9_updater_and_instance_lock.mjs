import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Milestone 9 Verification: Updater JobObject Breakaway & Single Instance Lock...')

// 1. Verify electron/main.ts
const mainTsPath = path.join(rootDir, 'electron', 'main.ts')
assert(fs.existsSync(mainTsPath), 'electron/main.ts must exist')
const mainContent = fs.readFileSync(mainTsPath, 'utf-8')

assert(
  mainContent.includes("app.setAppUserModelId('com.guidegram.desktop')"),
  'electron/main.ts must set AppUserModelId for Windows Taskbar grouping'
)
assert(
  mainContent.includes('app.requestSingleInstanceLock()'),
  'electron/main.ts must request single instance lock'
)
assert(
  mainContent.includes("app.on('second-instance'"),
  'electron/main.ts must listen for second-instance to focus existing window'
)
assert(
  mainContent.includes('mainWindow.restore()') && mainContent.includes('mainWindow.focus()'),
  'second-instance handler must restore, show, and focus mainWindow'
)
console.log('  ✅ Single Instance Lock and Windows Taskbar grouping verified.')

// 2. Verify electron/telegram/updateManager.ts
const updateManagerTsPath = path.join(rootDir, 'electron', 'telegram', 'updateManager.ts')
assert(fs.existsSync(updateManagerTsPath), 'updateManager.ts must exist')
const updateContent = fs.readFileSync(updateManagerTsPath, 'utf-8')

assert(
  updateContent.includes('apply_update.bat'),
  'updateManager.ts must generate a batch breakaway launcher'
)
assert(
  updateContent.includes("['/c', 'start', '\"\"'"),
  'updateManager.ts must launch via cmd.exe start to escape Chromium Job Object'
)
assert(
  updateContent.includes('Start-Process -FilePath $exe -WorkingDirectory $targetDir'),
  'apply_update.ps1 must launch updated exe with WorkingDirectory set'
)
assert(
  updateContent.includes('[System.IO.Compression.ZipFileExtensions]::ExtractToFile'),
  'apply_update.ps1 must extract zip entries'
)
assert(
  updateContent.includes('while (-not $extracted -and $retry -lt 5)'),
  'apply_update.ps1 must implement per-file retry on extraction'
)
console.log('  ✅ Resilient breakaway update script and retry extraction verified.')

console.log('🎉 All Milestone 9 checks passed successfully!')
