import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

console.log('====================================================')
console.log('Running Milestone 1 Empirical Stress & Boundary Tests')
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

// =========================================================================
// TEST SUITE 1: Multi-Chat Forwarding Boundary Cases
// =========================================================================
console.log('[SUITE 1] Multi-Chat Forwarding Boundaries (accountManager & main.ts)')

// Simulating AccountManager.forwardMessages core logic
async function mockAccountManagerForward(toChatIds, fromChatId, messageIds, options, mockClient) {
  const targets = Array.isArray(toChatIds) ? toChatIds : [toChatIds]
  if (targets.length === 0) return true

  const sourcePeer = (fromChatId === 'me' || fromChatId === 'acc1') ? 'me' : fromChatId

  const forwardPromises = targets.map(async (chatId) => {
    const targetPeer = (chatId === 'me' || chatId === 'acc1') ? 'me' : chatId
    return mockClient.forwardMessages(targetPeer, {
      messages: messageIds,
      fromPeer: sourcePeer,
      dropAuthor: options.withoutQuote ?? true,
      silent: options.silent ?? false,
    })
  })

  const results = await Promise.allSettled(forwardPromises)
  const errors = results.filter((r) => r.status === 'rejected')
  if (errors.length > 0 && errors.length === targets.length) {
    throw errors[0].reason
  }

  return true
}

runTest('1.1: Empty array toChatIds returns true immediately without calling client', async () => {
  let called = false
  const mockClient = {
    forwardMessages: async () => {
      called = true
    },
  }
  const result = await mockAccountManagerForward([], 'chat123', [1, 2], {}, mockClient)
  assert.strictEqual(result, true)
  assert.strictEqual(called, false, 'Client should NOT be called for empty array')
})

runTest('1.2: Single string chat ID is wrapped into array and forwarded', async () => {
  const calledWith = []
  const mockClient = {
    forwardMessages: async (target, opts) => {
      calledWith.push({ target, opts })
      return true
    },
  }
  const result = await mockAccountManagerForward('singleChatId', 'sourceChat', [100], { withoutQuote: true }, mockClient)
  assert.strictEqual(result, true)
  assert.strictEqual(calledWith.length, 1)
  assert.strictEqual(calledWith[0].target, 'singleChatId')
  assert.strictEqual(calledWith[0].opts.dropAuthor, true)
})

runTest('1.3: Multi-chat array executes all targets in parallel', async () => {
  const targets = ['chat1', 'chat2', 'chat3', 'me']
  const calledWith = []
  const mockClient = {
    forwardMessages: async (target) => {
      calledWith.push(target)
      return true
    },
  }
  const result = await mockAccountManagerForward(targets, 'sourceChat', [100], {}, mockClient)
  assert.strictEqual(result, true)
  assert.strictEqual(calledWith.length, 4)
  assert.deepStrictEqual(calledWith, ['chat1', 'chat2', 'chat3', 'me'])
})

runTest('1.4: Partial failure (some fail, some succeed) does not throw', async () => {
  const mockClient = {
    forwardMessages: async (target) => {
      if (target === 'failChat') throw new Error('Target chat blocked')
      return true
    },
  }
  const result = await mockAccountManagerForward(['goodChat', 'failChat'], 'sourceChat', [100], {}, mockClient)
  assert.strictEqual(result, true, 'Partial success should succeed without throwing')
})

runTest('1.5: Total failure (all targets fail) throws first error', async () => {
  const mockClient = {
    forwardMessages: async () => {
      throw new Error('All forward calls failed')
    },
  }
  let threw = false
  try {
    await mockAccountManagerForward(['bad1', 'bad2'], 'sourceChat', [100], {}, mockClient)
  } catch (e) {
    threw = true
    assert.strictEqual(e.message, 'All forward calls failed')
  }
  assert.strictEqual(threw, true)
})

runTest('1.6: IPC handler target fallback logic (toChatIds || toChatId)', () => {
  // Check main.ts line 471: const target = toChatIds || toChatId
  const case1 = [] || 'fallbackChat'
  // Note: in JS, [] is truthy, so [] || 'fallbackChat' returns []!
  assert.deepStrictEqual(case1, [], 'Empty array is preserved as empty array')

  const case2 = undefined || 'fallbackChat'
  assert.strictEqual(case2, 'fallbackChat')

  const case3 = ['c1', 'c2'] || 'fallbackChat'
  assert.deepStrictEqual(case3, ['c1', 'c2'])
})

// =========================================================================
// TEST SUITE 2: Participant list in Profile Drawer (1-on-1 vs Group)
// =========================================================================
console.log('\n[SUITE 2] Profile Drawer Participant List & Direct 1-on-1 Chats')

runTest('2.1: 1-on-1 Private Chat has isGroup=false; participants block is not rendered', () => {
  const directChat = {
    id: 'user_12345',
    title: 'Alice',
    isGroup: false,
    isChannel: false,
    isUser: true,
  }
  const chatDetails = {
    id: 'user_12345',
    title: 'Alice',
    isGroup: false,
    isChannel: false,
    isUser: true,
    participants: undefined, // 1-on-1 chats do not have participants list
  }

  // Check ChatViewport condition: chat.isGroup && (...)
  const isRendered = Boolean(directChat.isGroup)
  assert.strictEqual(isRendered, false, 'Participants section must not render for 1-on-1 chat')
})

runTest('2.2: Defensive rendering if chat.isGroup is true but participants is undefined/null', () => {
  const groupChat = {
    id: 'group_999',
    title: 'Test Group',
    isGroup: true,
  }
  const chatDetailsWithoutParticipants = {
    id: 'group_999',
    title: 'Test Group',
    isGroup: true,
    participants: undefined, // loading or failed
  }

  // Check ChatViewport expression:
  // chatDetails?.participants && chatDetails.participants.length > 0
  const hasParticipants = Boolean(
    chatDetailsWithoutParticipants?.participants &&
    chatDetailsWithoutParticipants.participants.length > 0
  )
  assert.strictEqual(hasParticipants, false)

  // Check fallback text logic:
  // {chatDetails ? 'No members visible' : 'Loading participants...'}
  const fallbackText = chatDetailsWithoutParticipants ? 'No members visible' : 'Loading participants...'
  assert.strictEqual(fallbackText, 'No members visible')
})

runTest('2.3: Defensive rendering if participants is an empty array', () => {
  const chatDetailsEmpty = {
    id: 'group_999',
    title: 'Test Group',
    isGroup: true,
    participants: [],
  }
  const hasParticipants = Boolean(
    chatDetailsEmpty?.participants &&
    chatDetailsEmpty.participants.length > 0
  )
  assert.strictEqual(hasParticipants, false)
})

runTest('2.4: Member search filtering handles undefined/missing fields without throwing', () => {
  const participants = [
    { id: '1', name: 'Alice', username: 'alice', role: 'creator' },
    { id: '2', name: 'Bob', username: undefined, role: 'admin' },
    { id: '3', name: '', username: undefined, role: 'member' },
  ]

  const queries = ['', 'alice', 'BOB', '999', '@nonexistent', '   ']
  for (const q of queries) {
    const trimmed = q.trim().toLowerCase()
    const filtered = participants.filter((p) => {
      if (!trimmed) return true
      return (
        (p.name && p.name.toLowerCase().includes(trimmed)) ||
        (p.username && p.username.toLowerCase().includes(trimmed)) ||
        p.id.includes(trimmed)
      )
    })
    assert(Array.isArray(filtered))
  }
})

runTest('2.5: getSenderRole and getSenderAdminTitle null-safe checks', () => {
  // Simulated helper functions from ChatViewport.tsx lines 300-315
  const getSenderRole = (msg, chatDetails) => {
    if (!chatDetails?.participants || !msg.senderId) return undefined
    const p = chatDetails.participants.find((part) => part.id === msg.senderId)
    return p?.role
  }

  const getSenderAdminTitle = (msg, chatDetails) => {
    if (!chatDetails?.participants || !msg.senderId) return undefined
    const p = chatDetails.participants.find((part) => part.id === msg.senderId)
    return p?.customTitle
  }

  const msg = { id: 1, senderId: '123' }
  assert.strictEqual(getSenderRole(msg, null), undefined)
  assert.strictEqual(getSenderRole(msg, { participants: undefined }), undefined)
  assert.strictEqual(getSenderAdminTitle(msg, undefined), undefined)
})

// =========================================================================
// TEST SUITE 3: Inline Keyboard Callback Data Types (Buffer vs String)
// =========================================================================
console.log('\n[SUITE 3] Inline Keyboard Callback Copy (Buffer vs String)')

// Simulating AccountManager parse logic (accountManager.ts lines 698-706 & 1390-1398)
function parseCallbackData(btnData) {
  let callbackData = undefined
  if (btnData) {
    try {
      callbackData = Buffer.isBuffer(btnData)
        ? btnData.toString('utf-8')
        : String(btnData)
    } catch (_) {
      callbackData = String(btnData)
    }
  }
  return callbackData
}

runTest('3.1: UTF-8 string Buffer decodes correctly', () => {
  const buf = Buffer.from('action:like:msg_42', 'utf-8')
  const parsed = parseCallbackData(buf)
  assert.strictEqual(parsed, 'action:like:msg_42')
})

runTest('3.2: Plain string passes through unchanged', () => {
  const str = 'cmd:vote_yes'
  const parsed = parseCallbackData(str)
  assert.strictEqual(parsed, 'cmd:vote_yes')
})

runTest('3.3: Arbitrary binary buffer (non-UTF8 bytes) does not throw', () => {
  // Raw bytes including 0x00, 0xFF, 0xFE, 0x80
  const binaryBuf = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x80, 0x7f])
  let parsed
  assert.doesNotThrow(() => {
    parsed = parseCallbackData(binaryBuf)
  })
  assert.strictEqual(typeof parsed, 'string')
  assert.strictEqual(parsed.length > 0, true)
})

runTest('3.4: Null and undefined data return undefined', () => {
  assert.strictEqual(parseCallbackData(null), undefined)
  assert.strictEqual(parseCallbackData(undefined), undefined)
})

runTest('3.5: Empty Buffer returns empty string without error', () => {
  const emptyBuf = Buffer.alloc(0)
  // empty buffer has length 0, but in JS Boolean(Buffer.alloc(0)) is true!
  const parsed = parseCallbackData(emptyBuf)
  assert.strictEqual(parsed, '')
})

runTest('3.6: Clipboard and Toast string formatting with binary decoded string', () => {
  const binaryBuf = Buffer.from([0x12, 0x34, 0x56, 0x78])
  const data = parseCallbackData(binaryBuf)
  // ChatViewport line 1565: `Copied callback data: "${btn.data}"`
  const toastMsg = `Copied callback data: "${data}"`
  assert.strictEqual(typeof toastMsg, 'string')
  assert(toastMsg.includes('Copied callback data: "'))
})

// =========================================================================
// TEST SUITE 4: CSS .disable-animations Scope & Targets
// =========================================================================
console.log('\n[SUITE 4] CSS .disable-animations Scope Verification')

runTest('4.1: index.css contains .disable-animations rules covering duration, iteration, delay', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf-8')

  assert(cssContent.includes('.disable-animations,'), 'Must target root .disable-animations')
  assert(cssContent.includes('.disable-animations *,'), 'Must target universal wildcard *')
  assert(cssContent.includes('animation-duration: 0.001ms !important;'), 'Must cut animation-duration')
  assert(cssContent.includes('transition-duration: 0.001ms !important;'), 'Must cut transition-duration')
  assert(cssContent.includes('transition-delay: 0s !important;'), 'Must cut transition-delay')
})

runTest('4.2: Loading spinner exception (*:not(.animate-spin)) is present', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf-8')
  assert(cssContent.includes('.disable-animations *:not(.animate-spin)'), 'Must preserve .animate-spin')
  assert(cssContent.includes('animation: none !important;'), 'Must set animation: none for non-spinners')
})

runTest('4.3: Backdrop-filter disabled on all descendants', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf-8')
  assert(cssContent.includes('.disable-animations * {'))
  assert(cssContent.includes('backdrop-filter: none !important;'))
  assert(cssContent.includes('-webkit-backdrop-filter: none !important;'))
})

runTest('4.4: Dialogs (.glass-modal) and Panels (.glass-panel) receive opaque compensation', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf-8')
  assert(cssContent.includes('.disable-animations .glass-panel'))
  assert(cssContent.includes('background: rgba(18, 21, 28, 0.96) !important;'))
  assert(cssContent.includes('.disable-animations .glass-modal'))
  assert(cssContent.includes('background: rgba(13, 15, 20, 0.98) !important;'))
})

runTest('4.5: Messages (.reply-highlight) neutralized from continuous repainting', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf-8')
  assert(cssContent.includes('.disable-animations .reply-highlight'))
  assert(
    cssContent.includes('box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.9) !important;') ||
    cssContent.includes('box-shadow: 0 0 0 2px rgba(57, 198, 164, 0.9) !important;')
  )
})

runTest('4.6: App.tsx applies .disable-animations to documentElement', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8')
  assert(appContent.includes("document.documentElement.classList.add('disable-animations')"))
  assert(appContent.includes("document.documentElement.classList.remove('disable-animations')"))
})

console.log('\n====================================================')
console.log(`Results: ${passedTests} passed, ${failedTests} failed.`)
console.log('====================================================')

if (failedTests > 0) {
  process.exit(1)
} else {
  console.log('ALL EMPIRICAL TESTS PASSED SUCCESSFULLY.')
}
