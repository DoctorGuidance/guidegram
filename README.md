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

## 🌟 Key Features & Advanced Capabilities

### 1. 📱 Unlimited Multi-Account Management
- Completely bypasses Telegram Desktop's 3-account limit. Add 5, 20, 50, or 100+ accounts concurrently without requiring Telegram Premium.
- Fluid vertical account dock with live unread indicators, avatar badges, and instant zero-latency switching.
- Easy authentication via **Telegram QR Code Scan** (Settings > Devices > Link Desktop Device) or international phone number with full 2FA support.

### 2. ⚡ Parallel Chunk Download Acceleration (Up to 3x Faster)
- **Multi-Worker MTProto Pipeline**: Unlike the official Telegram Desktop which downloads files using a single sequential stream, Guidegram automatically engages **4 parallel concurrent MTProto workers** with chunked 512KB buffers for large files and videos (> 2MB).
- Drastically improves media buffering, full video playback streaming, and large document download speeds.

### 3. 🛡️ Combinatorial Anti-Fingerprinting & Hardware Spoofing
- **Device Privacy Shield**: Prevents Telegram from fingerprinting your host machine across multiple sessions.
- Generates realistic, cryptographically seeded hardware identifiers from a database of over 28 workstation models (Dell XPS, ThinkPad X1 Carbon, Surface Pro, ASUS ZenBook, MacBook Pro) with randomized Windows UBR builds and language configurations.
- Eliminates chain bans and association risks across multiple business/marketing accounts.

### 4. 💼 100% Truly Portable Architecture
- Zero Windows registry pollution and zero hidden files in `AppData`.
- All credentials, MTProto session tokens, proxy lists, and settings reside in a local `./data` folder right next to the executable.
- Easily backup or transfer your entire workspace simply by copying the folder to another PC or USB flash drive.

### 5. 🔒 Per-Account Dedicated & Isolated Proxy
- Assign dedicated proxies (SOCKS5, HTTP, or MTProto) to individual accounts to prevent IP bans and isolate network traffic per identity.
- Real-time latency monitor with live ping testing to verify network reachability before connecting.

### 6. 🚀 Direct Forward Without Quote (Telegraph Style)
- Forward messages with original sender and channel headers cleanly removed (`dropAuthor: true` in MTProto).
- Keyboard accelerator `Alt + F` opens direct forwarding modal instantly for any selected or hovered message.

### 7. 📌 Multi-Cycle Pinned Messages & Dedicated Search Drawer (TDesktop v6.7.8+)
- **Interactive Pinned Banner**: Cycle smoothly through all pinned messages in a channel/group with counter indicators (`1 of N`) and smooth jump animations.
- **Dedicated Pinned Drawer**: One-click button (`All (N)`) opening a searchable drawer listing every pinned post with full-text search filter.

### 8. 📝 Large Text Auto-Splitter & .txt File Converter (TDesktop v6.7.8+)
- Automatically warns users when input exceeds Telegram's 4,096-character text limit.
- Provides 1-click actions to either **Send as .txt File** or **Split into Multiple Chunks** (~4,000 characters each) sequentially.

### 9. 🤖 AI Composer Text Assistant (TDesktop v6.7 & v7.0.9+)
- Integrated AI transformation menu right in the message compose area (`Sparkles` icon):
  - **Make Professional**: Transforms informal wording into polished corporate/business tone.
  - **Fix Grammar & Punctuation**: Cleans up whitespace, capitalization, and punctuation marks.
  - **Summarize Text**: Generates concise summaries from lengthy paragraphs.
  - **Add Expressive Emojis**: Emojifies relevant keywords seamlessly.
  - **Translate Hint**: Instant translation scaffolding.

### 10. 🎨 Floating Contextual Formatting Toolbar & Clickable Spoilers (TDesktop v7.0+)
- Floating formatting bar appears upon text selection: **Bold**, **Italic**, **Code**, **Strikethrough**, **Spoiler**, **Quote**, and **Insert Link**.
- Native interactive spoiler rendering (`||...||`) with click-to-reveal animations.

### 11. 🔍 In-Chat Search Highlighting & Match Navigation (TDesktop v7.1.3+)
- Automatic `<mark>` highlighting of matching search terms inside message bubbles.
- Search bar with match index counter (`X of Y matches`), step-by-step navigation (`ChevronUp` / `ChevronDown`), and keyboard shortcuts (`Enter` / `Shift+Enter` / `Esc`).

### 12. ⏰ Silent Messages & Scheduled Sending Modal (TDesktop v7.0.4 & v6.8.5+)
- Context menu and dropdown on the Send button for **Send Without Sound** (`BellOff`) and **Schedule Message...** (`Clock`).
- Modal with quick time presets (+30m, +2h, Tomorrow 09:00 AM) and custom date-time picker.

### 13. ⚡ 64Gram-Inspired Power Features
- **Show Chat ID & Message ID**: Interactive badges in the header and message footer with 1-click clipboard copy.
- **Message Timestamp with Seconds**: Millisecond-accurate timestamp display (`HH:mm:ss`).
- **Quick Forward to Saved Messages**: Bookmark action on hover + instant `Ctrl + Click` shortcut on any message bubble.
- **Group Sender Avatars**: Distinct visual sender avatars displayed next to messages in supergroups.
- **Bot Inline Button Inspection**: Click or right-click any inline keyboard button to inspect and copy `callback_data`.
- **Mark All Chats As Read**: One-click bulk read button in folder tabs with channel read-pointer advancement.
- **Deep Link Navigation**: Native handling of `tg://user?id=...`, `tg://openmessage`, and `@username` deep links.

### 14. 👁️ Ghost Mode & BiDi/RTL Typography
- Suppresses read receipts so you can preview incoming messages without triggering double checkmarks.
- Full native Persian/Arabic Right-to-Left (RTL) auto-detection and layout alignment across messages, quotes, and inline buttons.

---

## 🗺️ Vision & Continuous Evolution

> **The Foundation is Solid — The Future is Limitless.**
>
> Guidegram is built on a modular, enterprise-grade architecture engineered for continuous expansion. We have established the solid foundation by bringing the most requested power features of 64Gram and Telegram Desktop into a lightweight, portable client.
>
> Moving forward, Guidegram will progressively evolve beyond standard messaging capabilities with creative, groundbreaking features:
> - **Unified Multi-Account Cross-Search & Omnibox**
> - **Autonomous Smart Message Scheduling & Automated Response Workflows**
> - **Integrated Local AI Assistant for Offline Semantic Message Querying & Thread Analysis**
> - **Advanced Channel Management & Analytics Dashboard for Creators**
> - **Granular Privacy & Anti-Surveillance Controls**
>
> Each update expands this core foundation, making Guidegram the most capable, unrestricted Telegram client in the world.

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
