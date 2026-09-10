import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Milestone 8: Automatic Media Download Controls Verification')
console.log('====================================================\n')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  [PASS] ${msg}`)
    passed++
  } else {
    console.error(`  [FAIL] ${msg}`)
    failed++
  }
}

// 1. Electron & Frontend Type Definitions
console.log('[SUITE 1] AutoDownloadConfig Type Definitions')
const electronTypes = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/types.ts'), 'utf8')
assert(electronTypes.includes('export interface AutoDownloadConfig {'), 'electron/telegram/types.ts defines AutoDownloadConfig interface')
assert(electronTypes.includes('photosInChannels: boolean'), 'electron/telegram/types.ts specifies photosInChannels')
assert(electronTypes.includes('videosInChannels: boolean'), 'electron/telegram/types.ts specifies videosInChannels')
assert(electronTypes.includes('filesInChannels: boolean'), 'electron/telegram/types.ts specifies filesInChannels')
assert(electronTypes.includes('autoDownload?: AutoDownloadConfig'), 'AppConfig includes autoDownload field')

const frontendTypes = fs.readFileSync(path.join(process.cwd(), 'src/types/telegram.d.ts'), 'utf8')
assert(frontendTypes.includes('AutoDownloadConfig'), 'src/types/telegram.d.ts re-exports AutoDownloadConfig')
assert(frontendTypes.includes('AppConfig'), 'Frontend AppConfig is re-exported from telegram types')

// 2. SessionStore Defaults and Deep-Merge Protection
console.log('\n[SUITE 2] SessionStore Defaults & Backward Compatibility')
const sessionStore = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/sessionStore.ts'), 'utf8')
assert(sessionStore.includes('photosInChannels: false'), 'sessionStore.ts has photosInChannels: false by default to prevent flood')
assert(sessionStore.includes('videosInChannels: false'), 'sessionStore.ts has videosInChannels: false by default')
assert(sessionStore.includes('filesInChannels: false'), 'sessionStore.ts has filesInChannels: false by default')
assert(sessionStore.includes('...(parsed.autoDownload || {})'), 'sessionStore.ts deep merges autoDownload to protect existing configs')

// 3. ChatViewport On-Demand vs Auto-Download Logic
console.log('\n[SUITE 3] ChatViewport Auto-Download Filtering & Interactive Placeholder')
const chatViewport = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewport.includes('autoDownload?: AutoDownloadConfig'), 'ChatViewport accepts autoDownload prop')
assert(chatViewport.includes("const isChannel = !!chat?.isChannel"), 'ChatViewport distinguishes channel vs group vs private chat')
assert(chatViewport.includes('shouldAutoDownloadPhoto'), 'ChatViewport computes shouldAutoDownloadPhoto based on chat type and config')
assert(chatViewport.includes('requestMediaDownload(msg, false)'), 'ChatViewport conditionally triggers photo download')
assert(chatViewport.includes('Click to load image') || chatViewport.includes('Load Image'), 'ChatViewport provides on-demand click to load button when auto-download is disabled')

// 4. SettingsModal Controls & Persistence
console.log('\n[SUITE 4] SettingsModal UI & Config Update')
const settingsModal = fs.readFileSync(path.join(process.cwd(), 'src/components/SettingsModal.tsx'), 'utf8')
assert(settingsModal.includes('Automatic Media Download'), 'SettingsModal renders Automatic Media Download section')
assert(settingsModal.includes('photosInChannels'), 'SettingsModal contains control for photosInChannels')
assert(settingsModal.includes('photosInPrivate'), 'SettingsModal contains control for photosInPrivate')
assert(settingsModal.includes('photosInGroups'), 'SettingsModal contains control for photosInGroups')
assert(settingsModal.includes('autoDownload,'), 'SettingsModal handleSave sends autoDownload in updateConfig')

// 5. App.tsx Propagation
console.log('\n[SUITE 5] App.tsx Wiring')
const appCode = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')
assert(appCode.includes('autoDownload={config?.autoDownload}'), 'App.tsx passes autoDownload={config?.autoDownload} to ChatViewport')

console.log('\n====================================================')
console.log(`Milestone 8 Summary: ${passed} passed, ${failed} failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
