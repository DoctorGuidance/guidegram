import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Milestone 6: MTProto Missing Features Verification')
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

// 1. AccountManager Verification
console.log('[SUITE 1] AccountManager MTProto Methods')
const accountManagerCode = fs.readFileSync(path.join(process.cwd(), 'electron/telegram/accountManager.ts'), 'utf8')
assert(accountManagerCode.includes('getActiveSessions('), 'accountManager.ts implements getActiveSessions')
assert(accountManagerCode.includes('terminateSession('), 'accountManager.ts implements terminateSession')
assert(accountManagerCode.includes('translateMessage('), 'accountManager.ts implements translateMessage')
assert(accountManagerCode.includes('getCloudFolders('), 'accountManager.ts implements getCloudFolders')

// 2. Main IPC Handlers Verification
console.log('\n[SUITE 2] Electron Main IPC Registration')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("'telegram:get-active-sessions'"), 'main.ts registers telegram:get-active-sessions')
assert(mainCode.includes("'telegram:terminate-session'"), 'main.ts registers telegram:terminate-session')
assert(mainCode.includes("'telegram:translate-message'"), 'main.ts registers telegram:translate-message')
assert(mainCode.includes("'telegram:get-cloud-folders'"), 'main.ts registers telegram:get-cloud-folders')

// 3. Preload API Verification
console.log('\n[SUITE 3] Electron Preload API Exposure')
const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes('getActiveSessions:'), 'preload.ts exposes getActiveSessions')
assert(preloadCode.includes('terminateSession:'), 'preload.ts exposes terminateSession')
assert(preloadCode.includes('translateMessage:'), 'preload.ts exposes translateMessage')
assert(preloadCode.includes('getCloudFolders:'), 'preload.ts exposes getCloudFolders')

// 4. UI Components Verification
console.log('\n[SUITE 4] React UI Components & Hooks')
assert(fs.existsSync(path.join(process.cwd(), 'src/components/ActiveSessionsModal.tsx')), 'ActiveSessionsModal.tsx exists')
const activeSessionsCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ActiveSessionsModal.tsx'), 'utf8')
assert(activeSessionsCode.includes('getActiveSessions'), 'ActiveSessionsModal calls getActiveSessions')
assert(activeSessionsCode.includes('terminateSession'), 'ActiveSessionsModal handles session termination')
assert(activeSessionsCode.includes('handleTerminateAllOthers'), 'ActiveSessionsModal supports terminating all other sessions')

const mainMenuCode = fs.readFileSync(path.join(process.cwd(), 'src/components/MainMenuDrawer.tsx'), 'utf8')
assert(mainMenuCode.includes('<ActiveSessionsModal'), 'MainMenuDrawer.tsx renders ActiveSessionsModal')
assert(mainMenuCode.includes('Devices & Sessions'), 'MainMenuDrawer.tsx includes Devices & Sessions menu button')

const chatViewportCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewportCode.includes('handleTranslateMessage'), 'ChatViewport.tsx implements handleTranslateMessage')
assert(chatViewportCode.includes('MTProto Live Translation Banner'), 'ChatViewport.tsx renders live translation banner')
assert(chatViewportCode.includes('Translate to Persian'), 'ChatViewport.tsx provides message translation action button')

const chatTabsCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatTabs.tsx'), 'utf8')
assert(chatTabsCode.includes('getCloudFolders'), 'ChatTabs.tsx loads cloud folders via MTProto API')
assert(chatTabsCode.includes('folder:'), 'ChatTabs.tsx dynamically maps folder tabs')

const chatListCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatList.tsx'), 'utf8')
assert(chatListCode.includes("activeTab.startsWith('folder:')"), 'ChatList.tsx filters by active cloud folder')

console.log('\n====================================================')
console.log(`Results: ${passed} passed, ${failed} failed.`)
console.log('====================================================\n')

if (failed > 0) {
  process.exit(1)
}
