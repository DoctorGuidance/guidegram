import fs from 'fs'
import path from 'path'

console.log('====================================================')
console.log('Running Milestone 5: MTProto Discovery Features Verification')
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
assert(accountManagerCode.includes('getForumTopics('), 'accountManager.ts implements getForumTopics')
assert(accountManagerCode.includes('getScheduledMessages('), 'accountManager.ts implements getScheduledMessages')
assert(accountManagerCode.includes('sendScheduledMessageNow('), 'accountManager.ts implements sendScheduledMessageNow')
assert(accountManagerCode.includes('deleteScheduledMessages('), 'accountManager.ts implements deleteScheduledMessages')
assert(accountManagerCode.includes('sendReaction('), 'accountManager.ts implements sendReaction')
assert(accountManagerCode.includes('getSavedStarGifts('), 'accountManager.ts implements getSavedStarGifts')

// 2. Main IPC Handlers Verification
console.log('\n[SUITE 2] Electron Main IPC Registration')
const mainCode = fs.readFileSync(path.join(process.cwd(), 'electron/main.ts'), 'utf8')
assert(mainCode.includes("'telegram:get-forum-topics'"), 'main.ts registers telegram:get-forum-topics')
assert(mainCode.includes("'telegram:get-scheduled-messages'"), 'main.ts registers telegram:get-scheduled-messages')
assert(mainCode.includes("'telegram:send-scheduled-message-now'"), 'main.ts registers telegram:send-scheduled-message-now')
assert(mainCode.includes("'telegram:delete-scheduled-messages'"), 'main.ts registers telegram:delete-scheduled-messages')
assert(mainCode.includes("'telegram:send-reaction'"), 'main.ts registers telegram:send-reaction')
assert(mainCode.includes("'telegram:get-star-gifts'"), 'main.ts registers telegram:get-star-gifts')

// 3. Preload API Verification
console.log('\n[SUITE 3] Electron Preload API Exposure')
const preloadCode = fs.readFileSync(path.join(process.cwd(), 'electron/preload.ts'), 'utf8')
assert(preloadCode.includes('getForumTopics:'), 'preload.ts exposes getForumTopics')
assert(preloadCode.includes('getScheduledMessages:'), 'preload.ts exposes getScheduledMessages')
assert(preloadCode.includes('sendScheduledMessageNow:'), 'preload.ts exposes sendScheduledMessageNow')
assert(preloadCode.includes('deleteScheduledMessages:'), 'preload.ts exposes deleteScheduledMessages')
assert(preloadCode.includes('sendReaction:'), 'preload.ts exposes sendReaction')
assert(preloadCode.includes('getSavedStarGifts:'), 'preload.ts exposes getSavedStarGifts')

// 4. UI Components Verification
console.log('\n[SUITE 4] React UI Components & Interactions')
const chatViewportCode = fs.readFileSync(path.join(process.cwd(), 'src/components/ChatViewport.tsx'), 'utf8')
assert(chatViewportCode.includes('<ForumTopicsBar'), 'ChatViewport.tsx renders ForumTopicsBar')
assert(chatViewportCode.includes('<ScheduledMessagesModal'), 'ChatViewport.tsx renders ScheduledMessagesModal')
assert(chatViewportCode.includes('handleToggleReaction'), 'ChatViewport.tsx implements handleToggleReaction')
assert(
  chatViewportCode.includes('Reaction Picker Button') || chatViewportCode.includes('Quick Reactions Bar'),
  'ChatViewport.tsx contains reaction picker'
)

const mainMenuCode = fs.readFileSync(path.join(process.cwd(), 'src/components/MainMenuDrawer.tsx'), 'utf8')
assert(mainMenuCode.includes('<StarGiftsModal'), 'MainMenuDrawer.tsx renders StarGiftsModal')
assert(mainMenuCode.includes('Star Gifts') && mainMenuCode.includes('Shelf'), 'MainMenuDrawer.tsx includes Star Gifts menu item')

console.log('\n====================================================')
console.log(`Results: ${passed} passed, ${failed} failed.`)
console.log('====================================================\n')

if (failed > 0) {
  process.exit(1)
}
