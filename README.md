# 🚀 Guidegram

[![GitHub Release](https://img.shields.io/github/v/release/DoctorGuidance/guidegram?style=for-the-badge&color=22c55e&logo=github)](https://github.com/DoctorGuidance/guidegram/releases/latest)
[![Windows](https://img.shields.io/badge/Platform-Windows%20x64-0078d4?style=for-the-badge&logo=windows)](https://github.com/DoctorGuidance/guidegram/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

> **Next-Generation Portable Desktop Telegram Client with Unlimited Multi-Account & 64Gram / Telegraph Power Features**
> A modern, lightning-fast, portable desktop client for Telegram designed to eliminate the 3-account restriction, empower users with individual per-account proxies, and provide advanced forwarding and messaging capabilities.

---

## 📥 Download Ready-to-Use Release

No installation or developer tools required. Download the portable standalone zip for Windows 64-bit:

👉 **[Download Guidegram v1.0.0 (Windows x64 Portable ZIP)](https://github.com/DoctorGuidance/guidegram/releases/download/v1.0.0/Guidegram-v1.0.0-Windows-x64.zip)**

*Extract the archive to any directory or USB drive and run `Guidegram.exe` to launch.*

---

## 🌟 Key Features

### 1. 📱 Unlimited Multi-Account Management
- Completely bypasses Telegram Desktop's 3-account limit. Add 5, 20, 50, or 100+ accounts concurrently.
- Fluid vertical account dock with live unread indicators, avatar badges, and instant zero-latency switching.
- Easy authentication via **Telegram QR Code Scan** (Settings > Devices > Link Desktop Device) or international phone number with 2FA support.

### 2. 💼 100% Truly Portable Architecture
- Zero Windows registry pollution and zero hidden files in `AppData`.
- All credentials, MTProto session tokens, proxy lists, and settings reside in a local `./data` folder right next to the executable.
- Easily backup or transfer your entire workspace simply by copying the folder.

### 3. 🔒 Per-Account Dedicated Proxy
- Assign dedicated proxies (SOCKS5, HTTP, or MTProto) to individual accounts to prevent IP bans and isolate network traffic.
- Real-time latency monitor with live ping testing to verify network reachability before connecting.

### 4. 🚀 Direct Forward Without Quote (Telegraph Style)
- Forward messages with original sender and channel headers cleanly removed (`dropAuthor: true` in MTProto).
- Send silently without alerting recipients.

### 5. ⚡ 64Gram-Inspired Power Features
- **Show Chat ID & Message ID**: Interactive badges in the header and message footer with 1-click clipboard copy.
- **Message Timestamp with Seconds**: Millisecond-accurate timestamp display (`HH:mm:ss`).
- **Quick Forward to Saved Messages**: Bookmark action on hover + instant `Ctrl + Click` shortcut on any message bubble.
- **Power Keyboard Shortcuts**:
  - `Alt + F`: Open direct forward modal for active or hovered message.
  - `Alt + C`: Instant copy of message text.
  - `Esc`: Cancel active message selection.
- **Group Sender Avatars**: Distinct visual sender avatars displayed next to messages in supergroups.
- **Bot Inline Button Inspection**: Click or right-click any inline keyboard button to inspect and copy `callback_data`.
- **Mark All Chats As Read**: One-click bulk read button in folder tabs with channel read-pointer advancement.
- **Deep Link Navigation**: Native handling of `tg://user?id=...`, `tg://openmessage`, and `@username` deep links.

### 6. 🗂️ Unified Inbox & Categorized Tabs
- Optional consolidated feed aggregating unread messages across all connected accounts.
- Automatic conversation organization into **Personal**, **Groups**, **Channels**, **Bots**, and **Unread** tabs.

### 7. 👁️ Ghost Mode
- Suppresses read receipts so you can preview incoming messages without triggering double checkmarks.

---

## 🛠️ Tech Stack

- **Desktop Shell**: [Electron](https://www.electronjs.org/) configured with localized portable user paths (`userData -> ./data`)
- **Frontend Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) with glassmorphic dark theme and [Lucide Icons](https://lucide.dev/)
- **Telegram Engine**: [GramJS](https://github.com/gram-js/gramjs) (pure MTProto 2.0 implementation in TypeScript)
- **Packaging**: [electron-builder](https://www.electron.build/) targeting portable Windows x64 distributions

---

## 📂 Project Structure

```text
Guidegram/
├── data/                    # Portable local data directory (sessions, logs, config)
│   ├── sessions/            # Encrypted Telegram session keys
│   ├── logs/                # guidegram.log runtime diagnostics
│   └── config.json          # Account and proxy configuration
├── electron/
│   ├── main.ts              # Main Electron process, window management, IPC handlers
│   ├── preload.ts           # Secure ContextBridge IPC bridge (CommonJS bundle)
│   └── telegram/
│       ├── accountManager.ts # MTProto client management, QR auth, forwarder
│       ├── sessionStore.ts   # Persistent JSON configuration manager
│       ├── proxyManager.ts   # SOCKS5/MTProto proxy converter and ping tester
│       ├── logger.ts         # Dual file logging system
│       └── types.ts          # TypeScript interfaces and data models
├── src/
│   ├── components/          # React UI components
│   │   ├── AccountDock.tsx      # Vertical account switcher
│   │   ├── AddAccountModal.tsx  # QR code & phone login modal
│   │   ├── ChatList.tsx         # Conversation list with search
│   │   ├── ChatTabs.tsx         # Categorized chat tabs with Mark All Read
│   │   ├── ChatViewport.tsx     # Message viewer, power actions, shortcuts
│   │   ├── DirectForwardModal.tsx # No-quote forwarding dialog
│   │   ├── ProxySettingsModal.tsx # Proxy configuration & latency monitor
│   │   ├── SettingsModal.tsx    # Preferences, 64Gram toggles, log viewer
│   │   ├── UnifiedInbox.tsx     # Consolidated cross-account inbox
│   │   └── WelcomeScreen.tsx    # Onboarding screen
│   ├── App.tsx              # Root application state orchestrator
│   ├── main.tsx             # Application bootstrap with ErrorBoundary
│   └── index.css            # Tailwind styling and custom scrollbars
├── package.json
└── vite.config.ts
```

---

## 💻 Development Setup

### Prerequisites
- Node.js (v20 or newer recommended)
- `pnpm` (or `npm`)

### 1. Clone Repository
```bash
git clone https://github.com/DoctorGuidance/guidegram.git
cd guidegram
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Run Development Server
```bash
pnpm dev
```

### 4. Build Portable Executable
```bash
pnpm build:portable
```
The compiled portable application will be output to the `release/win-unpacked` directory.

---

## 🛡️ Security & Privacy

- **Local Session Storage**: All authentication credentials and session tokens remain on your local filesystem under `./data/sessions/`. No telemetry or third-party servers are involved.
- **Open MTProto Implementation**: Direct cryptographic connection between your machine and official Telegram MTProto Data Centers (DCs).
- **Custom API Credentials**: Guidegram ships with default Telegram Desktop credentials, but you can configure your own `api_id` and `api_hash` from [my.telegram.org](https://my.telegram.org) in the Preferences panel.

---

## 📜 License

Licensed under the [GNU General Public License v3.0](LICENSE).
