import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('====================================================')
console.log('Running Milestone 2 Empirical Stress & Boundary Tests')
console.log('====================================================\n')

let passedTests = 0
let failedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
    failedTests++
  }
}

async function runTestAsync(name, fn) {
  try {
    await fn()
    console.log(`  [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  [FAIL] ${name}`)
    console.error(`         Error: ${err.message}`)
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'))
    }
    failedTests++
  }
}

// =========================================================================
// SUITE 1: Textarea Auto-Expansion & Boundary Mechanics (Feature 16)
// =========================================================================
console.log('[SUITE 1] Textarea Auto-Expansion & Boundary Mechanics (Feature 16)')

// Reproduction of ChatViewport adjustTextareaHeight algorithm:
function simulateAdjustTextareaHeight(scrollHeight) {
  const minHeight = 24
  const maxHeight = 160
  const targetHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
  const overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  return { targetHeight, overflowY }
}

runTest('1.1: Single-line input (scrollHeight < 24px) clamps to minHeight 24px and overflow hidden', () => {
  const res1 = simulateAdjustTextareaHeight(0)
  assert.strictEqual(res1.targetHeight, 24)
  assert.strictEqual(res1.overflowY, 'hidden')

  const res2 = simulateAdjustTextareaHeight(18)
  assert.strictEqual(res2.targetHeight, 24)
  assert.strictEqual(res2.overflowY, 'hidden')
})

runTest('1.2: Multi-line input within bounds (e.g. 3 lines ~ 60px) grows exactly to scrollHeight', () => {
  const res = simulateAdjustTextareaHeight(60)
  assert.strictEqual(res.targetHeight, 60)
  assert.strictEqual(res.overflowY, 'hidden')
})

runTest('1.3: 50+ lines of text (scrollHeight ~ 1250px) strictly caps at 160px with overflow auto', () => {
  // 50 lines * 25px per line = 1250px
  const res = simulateAdjustTextareaHeight(1250)
  assert.strictEqual(res.targetHeight, 160, 'Height must not exceed 160px')
  assert.strictEqual(res.overflowY, 'auto', 'Overflow must switch to auto to enable vertical scrolling')
})

runTest('1.4: Extreme input (5,000 lines / 100,000 chars, scrollHeight ~ 125,000px) remains capped at 160px', () => {
  const res = simulateAdjustTextareaHeight(125000)
  assert.strictEqual(res.targetHeight, 160)
  assert.strictEqual(res.overflowY, 'auto')
})

runTest('1.5: Text deletion shrinks height back to minHeight (24px) with overflow hidden', () => {
  // Step 1: user typed 60 lines
  const large = simulateAdjustTextareaHeight(1500)
  assert.strictEqual(large.targetHeight, 160)
  assert.strictEqual(large.overflowY, 'auto')

  // Step 2: user cleared text (scrollHeight drops back to 24px)
  const cleared = simulateAdjustTextareaHeight(24)
  assert.strictEqual(cleared.targetHeight, 24)
  assert.strictEqual(cleared.overflowY, 'hidden')
})

// Simulating ChatViewport onKeyDown handler for textarea
function simulateTextareaKeyDown(e, state, actions) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault()
      actions.applyFormat('**')
      return
    }
    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault()
      actions.applyFormat('__')
      return
    }
  }

  if (e.key === 'Escape' && state.replyMessage) {
    e.preventDefault()
    actions.setReplyMessage(null)
    return
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    if (e.isComposing) return
    e.preventDefault()
    actions.handleSend()
  }
}

runTest('1.6: Enter sends message without Shift; Shift+Enter does not send', () => {
  let sent = false
  let defaultPrevented = false

  const actions = {
    handleSend: () => { sent = true },
    setReplyMessage: () => {},
    applyFormat: () => {},
  }

  // Case A: Enter without Shift -> sends
  simulateTextareaKeyDown({
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    preventDefault: () => { defaultPrevented = true },
  }, { replyMessage: null }, actions)

  assert.strictEqual(sent, true)
  assert.strictEqual(defaultPrevented, true)

  // Case B: Shift+Enter -> does NOT send
  sent = false
  defaultPrevented = false
  simulateTextareaKeyDown({
    key: 'Enter',
    shiftKey: true,
    isComposing: false,
    preventDefault: () => { defaultPrevented = true },
  }, { replyMessage: null }, actions)

  assert.strictEqual(sent, false, 'Shift+Enter must not send')
  assert.strictEqual(defaultPrevented, false, 'Shift+Enter must allow default newline')
})

runTest('1.7: IME composition (Chinese/Japanese/Korean input) prevents premature send on Enter', () => {
  let sent = false
  let defaultPrevented = false

  simulateTextareaKeyDown({
    key: 'Enter',
    shiftKey: false,
    isComposing: true, // User is currently composing characters in IME
    preventDefault: () => { defaultPrevented = true },
  }, { replyMessage: null }, {
    handleSend: () => { sent = true },
    setReplyMessage: () => {},
    applyFormat: () => {},
  })

  assert.strictEqual(sent, false, 'Enter during IME composition must NOT trigger send')
  assert.strictEqual(defaultPrevented, false, 'Enter during IME composition must NOT prevent default')
})

runTest('1.8: Escape dismisses active replyMessage', () => {
  let replyState = { id: 42, text: 'Some message' }
  let defaultPrevented = false

  simulateTextareaKeyDown({
    key: 'Escape',
    preventDefault: () => { defaultPrevented = true },
  }, { replyMessage: replyState }, {
    handleSend: () => {},
    setReplyMessage: (val) => { replyState = val },
    applyFormat: () => {},
  })

  assert.strictEqual(replyState, null, 'Escape must clear replyMessage')
  assert.strictEqual(defaultPrevented, true)
})

// =========================================================================
// SUITE 2: Docked Reply Bar & Fallback Stress (Feature 15)
// =========================================================================
console.log('\n[SUITE 2] Docked Reply Bar & Fallback Stress (Feature 15)')

// Import isRTL directly from compiled source or replicate utility
function isRTL(text) {
  if (!text) return false
  const cleaned = text.trim().replace(/^[\s\d\p{P}\p{S}]+/u, '')
  if (!cleaned) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
  }
  const firstCode = cleaned.codePointAt(0) || 0
  if (
    (firstCode >= 0x0600 && firstCode <= 0x08ff) ||
    (firstCode >= 0x0590 && firstCode <= 0x05ff) ||
    (firstCode >= 0xfb50 && firstCode <= 0xfdff) ||
    (firstCode >= 0xfe70 && firstCode <= 0xfeff)
  ) {
    return true
  }
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleaned)
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00'
  const secs = Math.floor(seconds)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const mStr = m.toString().padStart(2, '0')
  const sStr = s.toString().padStart(2, '0')
  if (h > 0) return `${h}:${mStr}:${sStr}`
  return `${mStr}:${sStr}`
}

function renderReplySnippet(replyMessage) {
  const author = `Reply to ${replyMessage.senderName || (replyMessage.isOutgoing ? 'You' : 'User')}`
  let text = ''
  if (replyMessage.text) {
    text = replyMessage.text
  } else if (replyMessage.mediaType === 'photo') {
    text = 'Photo'
  } else if (replyMessage.mediaType === 'video') {
    text = 'Video'
  } else if (replyMessage.isVoice || replyMessage.mediaType === 'voice') {
    text = `Voice message${replyMessage.mediaDuration ? ` (${formatDuration(replyMessage.mediaDuration)})` : ''}`
  } else if (replyMessage.mediaFileName) {
    text = replyMessage.mediaFileName
  } else {
    text = 'Media message'
  }

  const dir = isRTL(replyMessage.text) ? 'rtl' : 'ltr'
  return { author, text, dir }
}

runTest('2.1: Extremely long text snippet (10,000 chars) maintains valid structure and RTL direction', () => {
  const longText = 'A'.repeat(10000)
  const snippet = renderReplySnippet({ text: longText, senderName: 'Alice' })
  assert.strictEqual(snippet.author, 'Reply to Alice')
  assert.strictEqual(snippet.text.length, 10000)
  assert.strictEqual(snippet.dir, 'ltr')

  const longPersian = 'سلام '.repeat(2000)
  const snippetFa = renderReplySnippet({ text: longPersian, senderName: 'علی' })
  assert.strictEqual(snippetFa.author, 'Reply to علی')
  assert.strictEqual(snippetFa.dir, 'rtl')
})

runTest('2.2: Reply to outgoing vs incoming message formatting', () => {
  const outMsg = renderReplySnippet({ text: 'Outgoing test', isOutgoing: true })
  assert.strictEqual(outMsg.author, 'Reply to You')

  const incNamed = renderReplySnippet({ text: 'Incoming test', senderName: 'Bob', isOutgoing: false })
  assert.strictEqual(incNamed.author, 'Reply to Bob')

  const incUnk = renderReplySnippet({ text: 'Incoming test', isOutgoing: false })
  assert.strictEqual(incUnk.author, 'Reply to User')
})

runTest('2.3: Media fallback text generation when message text is absent', () => {
  assert.strictEqual(renderReplySnippet({ mediaType: 'photo' }).text, 'Photo')
  assert.strictEqual(renderReplySnippet({ mediaType: 'video' }).text, 'Video')
  assert.strictEqual(renderReplySnippet({ mediaType: 'voice', mediaDuration: 45 }).text, 'Voice message (00:45)')
  assert.strictEqual(renderReplySnippet({ mediaType: 'voice', mediaDuration: 3665 }).text, 'Voice message (1:01:05)')
  assert.strictEqual(renderReplySnippet({ mediaFileName: 'report_2026.pdf' }).text, 'report_2026.pdf')
  assert.strictEqual(renderReplySnippet({}).text, 'Media message')
})

// Simulating Reply Preview Thumbnail resolution
function resolveReplyThumbnail(replyMessage, downloadedMedia, requestMediaDownload) {
  const thumbUrl = downloadedMedia[`${replyMessage.id}_thumb`] || downloadedMedia[replyMessage.id] || replyMessage.mediaUrl
  if (replyMessage.mediaType === 'photo' || replyMessage.mediaType === 'video' || replyMessage.mediaType === 'sticker') {
    if (!thumbUrl) {
      requestMediaDownload(replyMessage, true)
      return { type: 'spinner', url: null }
    }
    return { type: 'image', url: thumbUrl }
  }
  if (replyMessage.isVoice || replyMessage.mediaType === 'voice') {
    return { type: 'icon_mic' }
  }
  if (replyMessage.mediaType === 'document') {
    return { type: 'icon_doc' }
  }
  return null
}

runTest('2.4: Missing media thumbnail triggers requestMediaDownload and yields spinner fallback', () => {
  let requested = null
  const downloadedMedia = {}
  const replyMessage = { id: 999, mediaType: 'photo' }

  const result = resolveReplyThumbnail(replyMessage, downloadedMedia, (msg, isThumb) => {
    requested = { id: msg.id, isThumb }
  })

  assert.strictEqual(result.type, 'spinner')
  assert.strictEqual(result.url, null)
  assert.deepStrictEqual(requested, { id: 999, isThumb: true })
})

runTest('2.5: Cached media thumbnail immediately renders image without calling download', () => {
  let called = false
  const downloadedMedia = { '999_thumb': 'blob:http://localhost/thumb-999' }
  const replyMessage = { id: 999, mediaType: 'photo' }

  const result = resolveReplyThumbnail(replyMessage, downloadedMedia, () => {
    called = true
  })

  assert.strictEqual(result.type, 'image')
  assert.strictEqual(result.url, 'blob:http://localhost/thumb-999')
  assert.strictEqual(called, false, 'Download must not be re-requested if already cached')
})

// =========================================================================
// SUITE 3: Rapid Chat Switching & State Isolation Stress (Features 15, 17, 19)
// =========================================================================
console.log('\n[SUITE 3] Rapid Chat Switching & State Isolation Stress (Features 15, 17, 19)')

class ChatViewportStateMock {
  constructor(initialChatId) {
    this.chatId = initialChatId
    this.previousChatId = initialChatId
    this.replyMessage = null
    this.stagedAttachments = []
    this.showScrollBottom = false
    this.unreadScrollCount = 0
    this.audioPlaying = false
  }

  setReply(msg) {
    this.replyMessage = msg
  }

  addAttachment(att) {
    this.stagedAttachments.push(att)
  }

  switchChat(newChatId) {
    this.chatId = newChatId

    // Chat Switch effect logic (from ChatViewport.tsx line 313 & line 407):
    if (this.chatId !== this.previousChatId) {
      this.previousChatId = this.chatId
      this.showScrollBottom = false
      this.unreadScrollCount = 0
      this.replyMessage = null
      this.stagedAttachments = []
      this.audioPlaying = false
    }
  }
}

runTest('3.1: Active reply bar is wiped out cleanly when switching to another chat', () => {
  const state = new ChatViewportStateMock('chat_1')
  state.setReply({ id: 101, text: 'Confidential message in chat 1' })
  assert.notStrictEqual(state.replyMessage, null)

  state.switchChat('chat_2')
  assert.strictEqual(state.replyMessage, null, 'replyMessage must be null after chat switch')
})

runTest('3.2: Staged attachments are wiped out cleanly when switching to another chat', () => {
  const state = new ChatViewportStateMock('chat_1')
  state.addAttachment({ name: 'file1.pdf', path: '/path/file1.pdf', type: 'document' })
  state.addAttachment({ name: 'pic.png', path: '/path/pic.png', type: 'media' })
  assert.strictEqual(state.stagedAttachments.length, 2)

  state.switchChat('chat_2')
  assert.strictEqual(state.stagedAttachments.length, 0, 'stagedAttachments must be empty after chat switch')
})

runTest('3.3: Rapid switching across multiple chats (1 -> 2 -> 3 -> 1) maintains state isolation', () => {
  const state = new ChatViewportStateMock('chat_1')
  state.setReply({ id: 101, text: 'Msg 101' })
  state.addAttachment({ name: 'a.txt' })

  state.switchChat('chat_2')
  assert.strictEqual(state.replyMessage, null)
  assert.strictEqual(state.stagedAttachments.length, 0)

  state.setReply({ id: 202, text: 'Msg 202 in chat 2' })
  state.switchChat('chat_3')
  assert.strictEqual(state.replyMessage, null)

  state.switchChat('chat_1')
  // Returning to chat 1 should NOT resurrect stale reply state
  assert.strictEqual(state.replyMessage, null)
  assert.strictEqual(state.stagedAttachments.length, 0)
})

// =========================================================================
// SUITE 4: Voice Recording Sub-Second Guard & Lifecycle Stress (Feature 18)
// =========================================================================
console.log('\n[SUITE 4] Voice Recording Sub-Second Guard & Lifecycle Stress (Feature 18)')

class VoiceRecorderMock {
  constructor() {
    this.isRecordingVoice = false
    this.recordingDuration = 0
    this.isUploadingVoice = false
    this.recordingChunks = []
    this.timerId = null
    this.toastMessage = null
    this.streamTracks = [{ stopped: false, stop() { this.stopped = true } }]
    this.audioContextClosed = false
    this.sentPayloads = []
  }

  startRecording() {
    this.isRecordingVoice = true
    this.recordingDuration = 0
    this.recordingChunks = ['fake-opus-chunk-1']
  }

  cancelRecording() {
    this.streamTracks.forEach(t => t.stop())
    this.audioContextClosed = true
    this.recordingChunks = []
    this.isRecordingVoice = false
    this.recordingDuration = 0
    this.toastMessage = 'Recording cancelled'
  }

  async stopAndSendRecording(replyMessage, saveTempFileFn, sendMediaFn) {
    // Guard from ChatViewport.tsx line 891:
    if (this.recordingDuration < 1) {
      this.toastMessage = 'Voice message too short'
      this.cancelRecording()
      return false
    }

    this.isUploadingVoice = true
    try {
      const tempPath = await saveTempFileFn({
        filename: `voice_${Date.now()}.ogg`,
        buffer: Buffer.from('mock-audio-data')
      })
      await sendMediaFn(tempPath, {
        isVoice: true,
        duration: this.recordingDuration,
        replyToMsgId: replyMessage?.id,
      })
      this.sentPayloads.push({ tempPath, duration: this.recordingDuration, replyTo: replyMessage?.id })
      this.toastMessage = 'Voice message sent'
      return true
    } finally {
      this.streamTracks.forEach(t => t.stop())
      this.audioContextClosed = true
      this.isUploadingVoice = false
      this.isRecordingVoice = false
      this.recordingDuration = 0
      this.recordingChunks = []
    }
  }
}

runTestAsync('4.1: Sub-second voice note (duration < 1s) triggers "Voice message too short" and cancels', async () => {
  const recorder = new VoiceRecorderMock()
  recorder.startRecording()
  assert.strictEqual(recorder.isRecordingVoice, true)
  assert.strictEqual(recorder.recordingDuration, 0) // Sub-second elapsed

  let fileSaved = false
  let mediaSent = false

  const result = await recorder.stopAndSendRecording(
    null,
    async () => { fileSaved = true },
    async () => { mediaSent = true }
  )

  assert.strictEqual(result, false, 'stopAndSendRecording must return false when duration < 1s')
  assert.strictEqual(recorder.toastMessage, 'Recording cancelled')
  assert.strictEqual(fileSaved, false, 'Must NOT save audio file when duration < 1s')
  assert.strictEqual(mediaSent, false, 'Must NOT send media when duration < 1s')
  assert.strictEqual(recorder.isRecordingVoice, false, 'Recording state must be cleared')
  assert.strictEqual(recorder.streamTracks[0].stopped, true, 'Microphone tracks must be released')
  assert.strictEqual(recorder.audioContextClosed, true, 'AudioContext must be closed')
  assert.strictEqual(recorder.recordingChunks.length, 0, 'Chunks buffer must be emptied')
})

runTestAsync('4.2: Valid voice note (duration >= 1s) succeeds, writes temp file, and dispatches payload', async () => {
  const recorder = new VoiceRecorderMock()
  recorder.startRecording()
  recorder.recordingDuration = 3 // 3 seconds

  let savedPath = null
  let dispatched = null

  const result = await recorder.stopAndSendRecording(
    { id: 777 },
    async (params) => {
      savedPath = `/tmp/${params.filename}`
      return savedPath
    },
    async (filePath, options) => {
      dispatched = { filePath, options }
    }
  )

  assert.strictEqual(result, true)
  assert.strictEqual(recorder.toastMessage, 'Voice message sent')
  assert.ok(savedPath.startsWith('/tmp/voice_'))
  assert.deepStrictEqual(dispatched, {
    filePath: savedPath,
    options: {
      isVoice: true,
      duration: 3,
      replyToMsgId: 777,
    }
  })
  assert.strictEqual(recorder.streamTracks[0].stopped, true)
  assert.strictEqual(recorder.isRecordingVoice, false)
})

// =========================================================================
// SUITE 5: Scroll-To-Bottom FAB & Unread Counter Thresholds (Feature 19)
// =========================================================================
console.log('\n[SUITE 5] Scroll-To-Bottom FAB & Unread Counter Thresholds (Feature 19)')

function simulateIncomingMessageScroll(distanceFromBottom, currentUnread, isOutgoing) {
  if (isOutgoing) {
    return { showScrollBottom: false, unreadCount: 0, autoScroll: true }
  }

  // Incoming message logic from ChatViewport.tsx line 342:
  if (distanceFromBottom <= 300) {
    return { showScrollBottom: false, unreadCount: 0, autoScroll: true }
  } else {
    return { showScrollBottom: true, unreadCount: currentUnread + 1, autoScroll: false }
  }
}

function formatUnreadBadge(count) {
  if (count <= 0) return null
  return count > 99 ? '99+' : `${count}`
}

runTest('5.1: Distance <= 300px triggers auto-scroll and keeps FAB hidden', () => {
  const res0 = simulateIncomingMessageScroll(0, 0, false)
  assert.strictEqual(res0.showScrollBottom, false)
  assert.strictEqual(res0.unreadCount, 0)
  assert.strictEqual(res0.autoScroll, true)

  const res300 = simulateIncomingMessageScroll(300, 0, false)
  assert.strictEqual(res300.showScrollBottom, false)
  assert.strictEqual(res300.unreadCount, 0)
  assert.strictEqual(res300.autoScroll, true)
})

runTest('5.2: Distance > 300px activates FAB and increments unread count', () => {
  const res301 = simulateIncomingMessageScroll(301, 0, false)
  assert.strictEqual(res301.showScrollBottom, true)
  assert.strictEqual(res301.unreadCount, 1)
  assert.strictEqual(res301.autoScroll, false)

  const resNext = simulateIncomingMessageScroll(500, res301.unreadCount, false)
  assert.strictEqual(resNext.showScrollBottom, true)
  assert.strictEqual(resNext.unreadCount, 2)
})

runTest('5.3: Badge formatting handles 1 to 99, and caps > 99 at "99+"', () => {
  assert.strictEqual(formatUnreadBadge(0), null)
  assert.strictEqual(formatUnreadBadge(1), '1')
  assert.strictEqual(formatUnreadBadge(45), '45')
  assert.strictEqual(formatUnreadBadge(99), '99')
  assert.strictEqual(formatUnreadBadge(100), '99+')
  assert.strictEqual(formatUnreadBadge(500), '99+')
})

runTest('5.4: Outgoing message by user always forces scroll to bottom and hides FAB', () => {
  // Even if user was scrolled 10,000px away from bottom:
  const res = simulateIncomingMessageScroll(10000, 50, true)
  assert.strictEqual(res.showScrollBottom, false)
  assert.strictEqual(res.unreadCount, 0)
  assert.strictEqual(res.autoScroll, true)
})

// =========================================================================
// SUITE 6: Source Code Integrity & AST Pattern Checks
// =========================================================================
console.log('\n[SUITE 6] Source Code Integrity & AST Pattern Checks')

runTest('6.1: ChatViewport.tsx contains maxHeight 160px and adjustTextareaHeight hook', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes("maxHeight: '160px'"), 'maxHeight style must be 160px')
  assert.ok(code.includes("const maxHeight = 160"), 'maxHeight variable must be 160')
  assert.ok(code.includes("el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'"), 'overflowY dynamic setting must exist')
})

runTest('6.2: ChatViewport.tsx contains sub-second voice recording guard (recordingDuration < 1)', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes('if (recordingDuration < 1)'), 'Must check recordingDuration < 1')
  assert.ok(code.includes("showToast('Voice message too short')"), 'Must notify user when too short')
  assert.ok(code.includes('handleCancelRecording()'), 'Must call cancel recording on sub-second audio')
})

runTest('6.3: ChatViewport.tsx clears replyMessage and stagedAttachments on chat switch', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes('if (chat?.id !== previousChatIdRef.current) {'), 'Must check chat change')
  assert.ok(code.includes('setReplyMessage(null)'), 'Must reset replyMessage')
  assert.ok(code.includes('setStagedAttachments([])'), 'Must reset stagedAttachments')
})

runTest('6.4: ChatViewport.tsx reply bar includes truncate and fallback media icons', () => {
  const code = fs.readFileSync('src/components/ChatViewport.tsx', 'utf8')
  assert.ok(code.includes('truncate font-normal leading-normal'), 'Must apply truncate to reply text snippet')
  assert.ok(code.includes("animate-spin"), 'Must have spinner for pending media thumbnail')
  assert.ok(code.includes("<Mic className="), 'Must have Mic icon for voice replies')
  assert.ok(code.includes("<FileText className="), 'Must have FileText icon for document replies')
})

runTest('6.5: accountManager.ts sendMedia supports isVoice and replyToMsgId', () => {
  const code = fs.readFileSync('electron/telegram/accountManager.ts', 'utf8')
  assert.ok(code.includes('if (options?.isVoice) {'), 'sendMedia must handle options.isVoice')
  assert.ok(code.includes('replyTo: options?.replyToMsgId'), 'sendMedia must handle options.replyToMsgId')
  assert.ok(code.includes('DocumentAttributeAudio'), 'GramJS DocumentAttributeAudio must be configured')
})

runTest('6.6: preload.ts exposes saveTempFile and sendMedia', () => {
  const code = fs.readFileSync('electron/preload.ts', 'utf8')
  assert.ok(code.includes('saveTempFile:'), 'preload must expose saveTempFile')
  assert.ok(code.includes('sendMedia:'), 'preload must expose sendMedia')
})

setTimeout(() => {
  console.log('\n====================================================')
  console.log(`Results: ${passedTests} passed, ${failedTests} failed.`)
  console.log('====================================================')
  if (failedTests === 0) {
    console.log('ALL EMPIRICAL TESTS PASSED SUCCESSFULLY.\n')
    process.exit(0)
  } else {
    console.error('TEST FAILURES DETECTED.\n')
    process.exit(1)
  }
}, 100)
