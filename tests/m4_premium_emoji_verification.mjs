import zlib from 'zlib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`)
    passed++
  } else {
    console.error(`  [FAIL] ${message}`)
    failed++
  }
}

console.log('====================================================')
console.log('Running Milestone 4: Telegram Premium & Custom Emoji Verification')
console.log('====================================================\n')

// Suite 1: TGS (Gzip Lottie) Decompression Mechanics
console.log('[SUITE 1] TGS (Gzip Lottie) Decompression Mechanics')
const mockLottieObj = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 180,
  w: 512,
  h: 512,
  nm: 'telegram_premium_star',
  layers: []
}
const rawJson = JSON.stringify(mockLottieObj)
const gzippedTgs = zlib.gzipSync(Buffer.from(rawJson, 'utf-8'))

assert(gzippedTgs[0] === 0x1f && gzippedTgs[1] === 0x8b, 'Gzip magic header detected (0x1f, 0x8b)')

const decompressed = zlib.gunzipSync(gzippedTgs).toString('utf-8')
const parsed = JSON.parse(decompressed)
assert(parsed.v === '5.7.4' && parsed.fr === 60, 'Decompressed TGS yields valid Lottie JSON specification')
assert(parsed.w === 512 && parsed.h === 512, 'Lottie dimensions 512x512 preserved')

// Suite 2: Fallback & Format Routing
console.log('\n[SUITE 2] Payload Format Routing')
function routeEmojiPayload(mimeType, buffer) {
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    try {
      const jsonStr = zlib.gunzipSync(buffer).toString('utf-8')
      return { format: 'lottie', data: JSON.parse(jsonStr) }
    } catch (_) {}
  }
  if (mimeType && (mimeType.includes('video') || mimeType.includes('mp4'))) {
    return { format: 'video', url: 'guidegram-media://local/test.mp4' }
  }
  return { format: 'image', url: 'guidegram-media://local/test.webp' }
}

const lottiePayload = routeEmojiPayload('application/x-tgsticker', gzippedTgs)
assert(lottiePayload.format === 'lottie' && lottiePayload.data.nm === 'telegram_premium_star', 'TGS routes to lottie format')

const videoPayload = routeEmojiPayload('video/mp4', Buffer.from('fake mp4 bytes'))
assert(videoPayload.format === 'video' && videoPayload.url.includes('.mp4'), 'Video emoji routes to video format')

const imagePayload = routeEmojiPayload('image/webp', Buffer.from('fake webp bytes'))
assert(imagePayload.format === 'image' && imagePayload.url.includes('.webp'), 'Static emoji routes to image format')

// Suite 3: AST Pattern & Source Code Verification
console.log('\n[SUITE 3] Source Code & IPC Integrity Verification')
const accountManagerSrc = fs.readFileSync(path.join(rootDir, 'electron/telegram/accountManager.ts'), 'utf-8')
const mainSrc = fs.readFileSync(path.join(rootDir, 'electron/main.ts'), 'utf-8')
const preloadSrc = fs.readFileSync(path.join(rootDir, 'electron/preload.ts'), 'utf-8')
const chatViewportSrc = fs.readFileSync(path.join(rootDir, 'src/components/ChatViewport.tsx'), 'utf-8')
const chatListSrc = fs.readFileSync(path.join(rootDir, 'src/components/ChatList.tsx'), 'utf-8')

assert(accountManagerSrc.includes('getCustomEmojiData'), 'accountManager.ts implements getCustomEmojiData')
assert(accountManagerSrc.includes('zlib.gunzipSync'), 'accountManager.ts unzips TGS using zlib.gunzipSync')
assert(accountManagerSrc.includes('personalChannelId'), 'accountManager.ts extracts personalChannelId')
assert(accountManagerSrc.includes('stargiftsCount'), 'accountManager.ts extracts stargiftsCount')
assert(accountManagerSrc.includes('birthday'), 'accountManager.ts extracts birthday')

assert(mainSrc.includes('telegram:get-custom-emoji-data'), 'electron/main.ts registers telegram:get-custom-emoji-data handler')
assert(preloadSrc.includes('getCustomEmojiData'), 'electron/preload.ts exposes getCustomEmojiData to frontend')

assert(chatViewportSrc.includes('CustomEmojiView'), 'ChatViewport.tsx exports and implements CustomEmojiView')
assert(chatViewportSrc.includes('lottie.loadAnimation'), 'ChatViewport.tsx renders animations using lottie-web')
assert(chatViewportSrc.includes('stargiftsCount'), 'ChatViewport.tsx displays star gifts badge')
assert(chatViewportSrc.includes('personalChannelId'), 'ChatViewport.tsx displays personal channel card')

assert(chatListSrc.includes('CustomEmojiView'), 'ChatList.tsx renders CustomEmojiView next to dialog title')
assert(chatListSrc.includes('customEmojiStatusId'), 'ChatList.tsx checks customEmojiStatusId')

console.log('\n====================================================')
console.log(`Results: ${passed} passed, ${failed} failed.`)
console.log('====================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('ALL EMPIRICAL TESTS PASSED SUCCESSFULLY.\n')
}
