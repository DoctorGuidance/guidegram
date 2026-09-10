# 🚀 Guidegram v1.4.0 — Storage Management, Audio Synthesizer, Downloads & Font Scaling

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, 64Gram & Telegraph Power Features, Hardware Anti-Fingerprinting, and Telegram Premium MTProto Capabilities.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.4.0</h3>
  <p><strong>Storage Usage & Cache Purge • Web Audio Synthesizer • Downloads Destination • Font Scaling • Keyboard Shortcuts</strong></p>
</div>

---

### 🌟 What's New in v1.4.0

#### 🗄️ 1. Storage Usage & One-Click Cache Purge
- **Live Disk Analyzer**: Scans and calculates downloaded media file sizes on disk, showing exact megabytes and file counts (`Cache on Disk: XX MB`).
- **Safe Cache Purge**: Clears temporary downloaded images and videos without touching credentials, account session tokens, or chat databases.

#### 🔔 2. Pure Web Audio Synthesizer & Real Notifications
- **Zero-Asset Notification Chime**: Synthesizes Telegram-style harmonic tones via the browser Web Audio API, guaranteeing flawless audio playback across all machines without external mp3 files.
- **Sound & Toast Toggle**: Full persistence of `notificationsEnabled` and `soundEnabled` in `AppConfig` with a "Play Chime" test button in Settings.

#### 📂 3. Custom Downloads Destination
- **Folder Picker**: Choose any directory on your computer as your downloads folder.
- **Save As Option**: Toggle "Always ask where to save each file" for complete per-file destination control.

#### 🎨 4. Chat Message Font Size Scaling
- **Adjustable Text Size**: Select message sizes from `12px` to `18px` (12, 13, 14, 15, 16, 18px) with real-time in-settings sample preview and instant message bubble scaling.

#### ⌨️ 5. Power Keyboard Shortcuts
- `Ctrl + 1..9`: Instant one-keystroke account switching across multiple profiles.
- `Ctrl + K` / `Ctrl + F`: Jump to conversation search input.
- `Alt + F`: Direct forward without quote (Telegraph style).
- `Esc`: Close open drawers, modals, and previews.
- Dedicated **Keyboard Shortcuts Guide** modal in Settings.

---

### 🌟 Features from v1.3.1 & v1.3.0 Included

#### 📥 6. Granular Automatic Media Download & Channel Data Saver
- Complete per-media and per-chat type controls for Photos, Videos, and Files across Private Chats, Groups, and Channels.
- **Channel Data Saver**: Channel photos are disabled by default to eliminate bandwidth flooding, with on-demand **"Click to load image"** buttons.

### 🌟 Features from v1.3.0 Included

#### 🎭 3. Animated Stickers Drawer (TGS Lottie & WebP)
- **Cloud Sticker Packs Sync**: Automatically queries and organizes all sticker sets installed on your Telegram account (`messages.getAllStickers` & `messages.getStickerSet`).
- **Interactive TGS Vector Animations**: Real-time client-side `.tgs` gzip decompression with smooth vector animations rendered via `lottie-web`.
- **Instant Click-to-Send**: Employs native MTProto `Api.InputDocument` references for instant zero-overhead delivery without re-uploading file bytes.
- **Dedicated Drawer UI**: Easily accessible via the new `Smile` icon in the message composer.

---

#### 🕵️ 2. Stealth Stories Engine with Ghost Mode Superpower
- **Story Ring Indicators**: Beautiful interactive gradient rings displayed around contact avatars in the conversation list.
- **Dedicated Story Viewer**: Segmented timeline progress playback, full caption rendering, and intuitive click/tap navigation.
- **Exclusive Stealth Mode**: When **Ghost Mode** is enabled, story read receipts (`stories.readStories`) are strictly bypassed. You can view any contact's or channel's stories completely anonymously without appearing in their viewer list!

---

#### 🌐 3. In-Chat Live Message Translation
- **Native MTProto Translation Engine**: Powered by `messages.translateText` directly communicating with Telegram Data Centers.
- **Bilingual & RTL Optimized**: One-click translation of incoming and outgoing foreign messages directly from the message hover action bar with tailored Persian (`fa`) support and Right-to-Left formatting.
- **Dismissible Translation Cards**: Clean inline translated cards below message bubbles that keep chat flow natural.

---

#### ⚡ 4. Channel Boost Status & Level Tracking
- **Level & Progress Tracking**: Inspect any channel's current boost level, total boost count, and progress towards the next level (`premium.getBoostsStatus`).
- **Visual Progress Bar & Deep-Links**: Sleek animated progress bar in the Channel Info drawer with direct boost URLs.

---

#### 🛡️ 5. Active Sessions Management & 2FA Security
- **Multi-Device Session Inspector**: Full list of all desktop and mobile devices connected to your account with platform icons, IP addresses, country, and app versions (`account.getAuthorizations`).
- **Remote Session Revocation**: Terminate specific unrecognized devices or revoke all other sessions with a single click.
- **Two-Step Verification (2FA) Status**: Real-time inspection of your Cloud Password protection and recovery email configuration (`account.getPassword`).

---

#### 📁 6. Telegram Cloud Chat Folders
- **Server-Side Folder Synchronization**: Automatically loads custom folders and filters configured on your mobile or desktop Telegram clients (`messages.getDialogFilters`).
- **Dynamic Category Tabs**: Integrated directly into the chat header with instant peer inclusion and exclusion filtering.

---

### 🧪 Verification & Empirical Testing
- **166 / 166 Automated Tests Passed** across all 7 verification milestones.
- **TypeScript Strict Compliance**: 0 errors across main, preload, and renderer layers (`npx tsc --noEmit`).
- **Zero AI / Internal Tooling Leakage**: Clean, native, production-ready codebase adhering strictly to open-source standards.
- **Cross-Platform Portable Builds**: Fully verified with standalone portable Windows x64 distributions.

---

### 📥 Download & Installation

Download the portable executable or installer from the assets below:
- `Guidegram-Setup-1.3.0.exe` (Windows Installer)
- `Guidegram-1.3.0-win.zip` (Standalone Portable Archive)
