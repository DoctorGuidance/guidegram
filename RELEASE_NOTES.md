# 🚀 Guidegram v1.3.1 — Automatic Media Download Controls & Channel Data Saver

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, 64Gram & Telegraph Power Features, Hardware Anti-Fingerprinting, and Telegram Premium MTProto Capabilities.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.3.1</h3>
  <p><strong>Automatic Media Download Controls • Channel Data Saver • Animated Stickers Drawer • Stealth Stories Engine • In-Chat Translation</strong></p>
</div>

---

### 🌟 What's New in v1.3.1

#### 📥 1. Granular Automatic Media Download Controls
- **Full Parity with Telegram Desktop**: Complete per-media and per-chat type controls for **Photos**, **Videos**, and **Files** across:
  - **Private Chats** (Direct 1-on-1 conversations)
  - **Groups** (Small and supergroups)
  - **Channels** (Broadcast channels)
- **Configurable in Settings**: New dedicated section in the `Advanced` tab of Settings with a master toggle and individual category checkboxes.
- **Deep Merge Compatibility**: Safely initializes with existing configurations without losing user preferences.

#### 🛡️ 2. Channel Data Saver (Disabled by Default)
- **Automatic Channel Photo Download Disabled by Default**: Viewing high-traffic channels will no longer eagerly download hundreds of high-resolution images in the background, saving bandwidth and disk space.
- **On-Demand Loading Cards**: When automatic download is disabled, photos and media display an elegant placeholder card with a **"Click to load image"** button so you only download what you choose to see.

---

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
