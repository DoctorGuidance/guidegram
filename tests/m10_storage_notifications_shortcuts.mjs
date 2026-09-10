import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Milestone 10: Storage Usage, Notifications, Downloads & Shortcuts Verification')
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

// 1. Type Definitions Verification
console.log('[SUITE 1] Extended AppConfig & CacheStats Type Definitions')
const electronTypes = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/types.ts'), 'utf8')
assert(electronTypes.includes('export interface CacheStats {'), 'electron/telegram/types.ts defines CacheStats interface')
assert(electronTypes.includes('notificationsEnabled?: boolean'), 'AppConfig defines notificationsEnabled')
assert(electronTypes.includes('soundEnabled?: boolean'), 'AppConfig defines soundEnabled')
assert(electronTypes.includes('downloadsPath?: string'), 'AppConfig defines downloadsPath')
assert(electronTypes.includes('alwaysAskDownloadPath?: boolean'), 'AppConfig defines alwaysAskDownloadPath')
assert(electronTypes.includes('chatFontSize?: number'), 'AppConfig defines chatFontSize')

const frontendTypes = fs.readFileSync(path.join(process.cwd(), 'src/types/telegram.d.ts'), 'utf8')
assert(frontendTypes.includes('CacheStats'), 'src/types/telegram.d.ts re-exports CacheStats')

// 2. SessionStore Cache Management Implementation
console.log('\n[SUITE 2] SessionStore Cache Scanning & Purging')
const sessionStore = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/sessionStore.ts'), 'utf8')
assert(sessionStore.includes('getCacheStats(): CacheStats'), 'sessionStore.ts implements getCacheStats')
assert(sessionStore.includes('clearCache():'), 'sessionStore.ts implements clearCache')
assert(sessionStore.includes('downloadsPath: path.join(this.dataDir, \'downloads\')'), 'sessionStore.ts sets default downloadsPath')
assert(sessionStore.includes('chatFontSize: 14'), 'sessionStore.ts sets default chatFontSize to 14px')

// 3. Electron Main IPC Registration
console.log('\n[SUITE 3] Electron Main IPC Handlers')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("'telegram:get-cache-stats'"), 'main.ts registers telegram:get-cache-stats')
assert(mainCode.includes("'telegram:clear-cache'"), 'main.ts registers telegram:clear-cache')
assert(mainCode.includes("'telegram:select-download-directory'"), 'main.ts registers telegram:select-download-directory')

// 4. Electron Preload API Exposure
console.log('\n[SUITE 4] Preload Guidegram API')
const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes('getCacheStats:'), 'preload.ts exposes getCacheStats')
assert(preloadCode.includes('clearCache:'), 'preload.ts exposes clearCache')
assert(preloadCode.includes('selectDownloadDirectory:'), 'preload.ts exposes selectDownloadDirectory')

// 5. Web Audio Notification Synthesizer
console.log('\n[SUITE 5] Web Audio Sound Effects Utility')
assert(fs.existsSync(path.join(process.cwd(), 'src/utils/soundEffects.ts')), 'src/utils/soundEffects.ts exists')
const soundCode = fs.readFileSync(path.join(process.cwd(), 'src/utils/soundEffects.ts'), 'utf8')
assert(soundCode.includes('playNotificationSound'), 'soundEffects.ts exports playNotificationSound function')
assert(soundCode.includes('createOscillator'), 'soundEffects.ts synthesizes pure tones with zero external asset dependencies')

// 6. SettingsModal UI Controls
console.log('\n[SUITE 6] SettingsModal UI & Config Persistence')
const settingsModal = fs.readFileSync(path.join(process.cwd(), 'src/components/SettingsModal.tsx'), 'utf8')
assert(settingsModal.includes('Storage Usage & Media Cache'), 'SettingsModal renders Storage Usage & Media Cache section')
assert(settingsModal.includes('handleClearCache'), 'SettingsModal implements handleClearCache')
assert(settingsModal.includes('Downloads Destination'), 'SettingsModal renders Downloads Destination picker')
assert(settingsModal.includes('Message Font Size'), 'SettingsModal renders Message Font Size scaling control')
assert(settingsModal.includes('Keyboard Shortcuts'), 'SettingsModal renders Keyboard Shortcuts guide')
assert(settingsModal.includes('Play Chime'), 'SettingsModal provides Play Chime preview button')

// 7. App.tsx & ChatViewport.tsx Wiring
console.log('\n[SUITE 7] App.tsx & ChatViewport Scaling and Shortcuts')
const appCode = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8')
assert(appCode.includes('playNotificationSound()'), 'App.tsx plays notification chime on incoming messages')
assert(appCode.includes('chatFontSize={config?.chatFontSize || 14}'), 'App.tsx propagates chatFontSize to ChatViewport')
assert(appCode.includes('Ctrl + 1..9'), 'App.tsx implements instant account switching shortcut')
assert(appCode.includes('Ctrl + K'), 'App.tsx implements fast search shortcut')

const chatViewport = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewport.includes('chatFontSize?: number'), 'ChatViewport accepts chatFontSize prop')
assert(chatViewport.includes('chatFontSize}px'), 'ChatViewport applies dynamic font size to message bubbles')

console.log('\n====================================================')
console.log(`Milestone 9 Summary: ${passed} passed, ${failed} failed`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
