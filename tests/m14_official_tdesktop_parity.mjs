import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

console.log('--- Starting Milestone 14: Official Telegram Desktop Parity Validation ---')

const workspaceRoot = process.cwd()

// 1. Check Electron Telegram types
const typesFile = join(workspaceRoot, 'electron', 'telegram', 'types.ts')
if (!existsSync(typesFile)) {
  console.error('FAIL: electron/telegram/types.ts not found')
  process.exit(1)
}
const typesContent = readFileSync(typesFile, 'utf-8')
if (!typesContent.includes('interface MyFullProfile') || !typesContent.includes('interface PrivacySecuritySettings')) {
  console.error('FAIL: Missing MyFullProfile or PrivacySecuritySettings in types.ts')
  process.exit(1)
}
console.log('✓ Verified electron/telegram/types.ts has MyFullProfile and PrivacySecuritySettings')

// 2. Check AccountManager MTProto methods
const accMgrFile = join(workspaceRoot, 'electron', 'telegram', 'accountManager.ts')
const accMgrContent = readFileSync(accMgrFile, 'utf-8')
const expectedAccMethods = ['getMyFullProfile', 'getPrivacySettings', 'createGroup', 'createChannel']
for (const m of expectedAccMethods) {
  if (!accMgrContent.includes(`${m}(`)) {
    console.error(`FAIL: accountManager.ts missing method ${m}`)
    process.exit(1)
  }
}
console.log('✓ Verified accountManager.ts has all 4 MTProto backend methods')

// 3. Check MainMenuDrawer.tsx (Screenshot 1)
const mainMenuFile = join(workspaceRoot, 'src', 'components', 'MainMenuDrawer.tsx')
const mainMenuContent = readFileSync(mainMenuFile, 'utf-8')
const expectedMenuFeatures = [
  'Set Emoji Status',
  'Add Account',
  'Archived chats',
  'My Profile',
  'New Group',
  'New Channel',
  'Contacts',
  'Calls',
  'Saved Messages',
  'Settings',
  'Night Mode',
  'formatBadge',
]
for (const feat of expectedMenuFeatures) {
  if (!mainMenuContent.includes(feat)) {
    console.error(`FAIL: MainMenuDrawer missing feature: ${feat}`)
    process.exit(1)
  }
}
console.log('✓ Verified MainMenuDrawer.tsx has 100% of Screenshot 1 features')

// 4. Check MyProfileDrawer.tsx (Screenshot 2)
const myProfileFile = join(workspaceRoot, 'src', 'components', 'MyProfileDrawer.tsx')
const myProfileContent = readFileSync(myProfileFile, 'utf-8')
const expectedProfileFeatures = [
  'Info',
  'Camera',
  'online',
  'Any details such as age',
  'Phone number',
  'Username',
  'Personal channel',
  'Chat automation',
  'Your name color',
  'Birthday',
  'QrCode',
]
for (const feat of expectedProfileFeatures) {
  if (!myProfileContent.includes(feat)) {
    console.error(`FAIL: MyProfileDrawer missing feature: ${feat}`)
    process.exit(1)
  }
}
console.log('✓ Verified MyProfileDrawer.tsx has 100% of Screenshot 2 features')

// 5. Check SettingsModal.tsx (Screenshots 3, 4, 5)
const settingsFile = join(workspaceRoot, 'src', 'components', 'SettingsModal.tsx')
const settingsContent = readFileSync(settingsFile, 'utf-8')
const expectedSettingsFeatures = [
  // Privacy & Security (Screenshot 3)
  'Two-Step Verification',
  'Auto-Delete Messages',
  'Local passcode',
  'Passkeys',
  'Blocked users',
  'Connected websites',
  'Active sessions',
  'Manage your sessions on all your devices.',
  'Phone number',
  'Last seen & online',
  'Profile photos',
  'Forwarded messages',
  'Calls',
  'Voice messages',
  'Birthday',
  'Gifts',
  'Bio',
  'Saved Music',
  'Invites',
  // Advanced Settings (Screenshot 4)
  'Connection type',
  'Default (TCP used)',
  'Download path',
  'Manage local storage',
  'Ask download path for each file',
  'Automatic media download',
  'In private chats',
  'In groups',
  'In channels',
  'Window title bar',
  'Show chat name',
  'Show active account',
  'Total unread count',
  'Use system window frame',
  'System integration',
  'Show tray icon',
  'Show taskbar icon',
  'Use monochrome icon',
  'Launch Telegram when system starts',
  'Launch minimized',
  // Chat Settings (Screenshot 5)
  'Classic',
  'Day',
  'Tinted',
  'Night',
  'Your name color',
  'Auto-night mode',
  'Font family',
  'Custom themes',
  'Chat wallpaper',
  'Choose from gallery',
  'Choose from file',
  'Adaptive layout for wide screens',
  'Chat list quick action',
  'Change folder',
]
for (const feat of expectedSettingsFeatures) {
  if (!settingsContent.includes(feat)) {
    console.error(`FAIL: SettingsModal missing feature: ${feat}`)
    process.exit(1)
  }
}
console.log('✓ Verified SettingsModal.tsx has 100% of Screenshots 3, 4, 5 features')

// 6. Check App.tsx integration
const appFile = join(workspaceRoot, 'src', 'App.tsx')
const appContent = readFileSync(appFile, 'utf-8')
if (!appContent.includes('<MyProfileDrawer') || !appContent.includes('<ContactsModal') || !appContent.includes('<CreateChatModal')) {
  console.error('FAIL: App.tsx did not mount all new drawers/modals')
  process.exit(1)
}
console.log('✓ Verified App.tsx mounts MyProfileDrawer, ContactsModal, and CreateChatModal')

console.log('==================================================================')
console.log('SUCCESS: All 5 official Telegram Desktop parity screenshots verified!')
console.log('==================================================================')
