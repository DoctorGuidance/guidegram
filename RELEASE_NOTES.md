# 🚀 Guidegram v1.1.1 — Hotfix & UX Polish

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Per-Account Isolated Proxies, 64Gram & Telegraph Capabilities, and Hardware Anti-Fingerprinting.

---

### 🌟 What's New in v1.1.1

#### 🖼️ Fix System Tray & Taskbar Icon Visibility
- **Fixed Invisible System Tray Icon**: Resolved root-cause path resolution error (`resources/resources`) in packaged Windows builds that previously caused Electron to create an empty transparent system tray icon slot.
- **Window Taskbar Icon**: Ensured `mainWindow` explicitly receives high-resolution `NativeImage` icon on creation.
- **Fail-Safe Embedded Asset Fallback**: Embedded resilient base64 DataURL fallback for the official Guidegram icon so tray and taskbar icons never appear blank or missing under any execution environment.
- **Direct Physical Resource Packaging**: Added `extraResources` mapping in `electron-builder.json` to guarantee all icon assets (`.ico`, `.png`) are unpacked directly on disk.

#### 📊 Real-Time Download Progress & Status Feedback for Updates
- **Live Progress Bar**: The update banner now provides a real-time progress bar displaying current download percentage (0% - 100%).
- **Detailed Byte Metrics**: Shows exact downloaded megabytes vs total package size (e.g. `45.2 MB / 94.8 MB`).
- **Stage Tracking**: Clearly indicates current lifecycle stages: `Downloading update...`, `Extracting update files...`, and `Restarting Guidegram...`.
- **Reassuring Automation Guidance**: Informs users that their data is untouched and the app will restart automatically once completed.

---

# 🚀 Guidegram v1.1.0 — Modern Telegram Desktop Parity & Next-Gen Power Features

### 🌟 What's New in v1.1.0

#### ⚡ Parallel Chunk Download Acceleration (Up to 3x Faster)
- **Multi-Worker MTProto Pipeline**: Unlike the official Telegram Desktop which downloads files through a single sequential stream, Guidegram automatically engages **4 parallel concurrent MTProto workers** with chunked 512KB buffers for large files and videos (> 2MB).
- Drastically improves media buffering, full video playback streaming, and large document download speeds.

#### 🛡️ Combinatorial Anti-Fingerprinting & Hardware Spoofing
- **Device Privacy Shield**: Prevents Telegram from fingerprinting your host machine across multiple sessions.
- Generates realistic, cryptographically seeded hardware identifiers from a database of over 28 workstation models (Dell XPS, ThinkPad X1 Carbon, Surface Pro, ASUS ZenBook, MacBook Pro) with randomized Windows UBR builds and language configurations.
- Eliminates chain bans and association risks across multiple business/marketing accounts.

#### 📌 Multi-Cycle Pinned Messages & Dedicated Search Drawer (TDesktop v6.7.8+)
- **Interactive Pinned Banner**: Cycle smoothly through all pinned messages in a channel/group with counter indicators (`1 of N`) and smooth jump animations.
- **Dedicated Pinned Drawer**: One-click button (`All (N)`) opening a searchable drawer listing every pinned post with full-text search filter.

#### 📝 Large Text Auto-Splitter & .txt File Converter (TDesktop v6.7.8+)
- Automatically warns users when input exceeds Telegram's 4,096-character text limit.
- Provides 1-click actions to either **Send as .txt File** or **Split into Multiple Chunks** (~4,000 characters each) sequentially.

#### 🤖 AI Composer Text Assistant (TDesktop v6.7 & v7.0.9+)
- Integrated AI transformation menu right in the message compose area (`Sparkles` icon):
  - **Make Professional**: Transforms informal wording into polished corporate/business tone.
  - **Fix Grammar & Punctuation**: Cleans up whitespace, capitalization, and punctuation marks.
  - **Summarize Text**: Generates concise summaries from lengthy paragraphs.
  - **Add Expressive Emojis**: Emojifies relevant keywords seamlessly.
  - **Translate Hint**: Instant translation scaffolding.

#### 🎨 Floating Contextual Formatting Toolbar & Clickable Spoilers (TDesktop v7.0+)
- Floating formatting bar appears upon text selection: **Bold**, **Italic**, **Code**, **Strikethrough**, **Spoiler**, **Quote**, and **Insert Link**.
- Native interactive spoiler rendering (`||...||`) with click-to-reveal animations.

#### 🔍 In-Chat Search Highlighting & Match Navigation (TDesktop v7.1.3+)
- Automatic `<mark>` highlighting of matching search terms inside message bubbles.
- Search bar with match index counter (`X of Y matches`), step-by-step navigation (`ChevronUp` / `ChevronDown`), and keyboard shortcuts (`Enter` / `Shift+Enter` / `Esc`).

#### ⏰ Silent Messages & Scheduled Sending Modal (TDesktop v7.0.4 & v6.8.5+)
- Context menu and dropdown on the Send button for **Send Without Sound** (`BellOff`) and **Schedule Message...** (`Clock`).
- Modal with quick time presets (+30m, +2h, Tomorrow 09:00 AM) and custom date-time picker.

#### ⚡ 64Gram-Inspired Power Features
- **Show Chat ID & Message ID**: Interactive badges in the header and message footer with 1-click clipboard copy.
- **Message Timestamp with Seconds**: Millisecond-accurate timestamp display (`HH:mm:ss`).
- **Quick Forward to Saved Messages**: Bookmark action on hover + instant `Ctrl + Click` shortcut on any message bubble.
- **Group Sender Avatars**: Distinct visual sender avatars displayed next to messages in supergroups.
- **Bot Inline Button Inspection**: Click or right-click any inline keyboard button to inspect and copy `callback_data`.
- **Mark All Chats As Read**: One-click bulk read button in folder tabs with channel read-pointer advancement.
- **Deep Link Navigation**: Native handling of `tg://user?id=...`, `tg://openmessage`, and `@username` deep links.

#### 👁️ Ghost Mode & BiDi/RTL Typography
- Suppresses read receipts so you can preview incoming messages without triggering double checkmarks.
- Full native Persian/Arabic Right-to-Left (RTL) auto-detection and layout alignment across messages, quotes, and inline buttons.

---

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | `Guidegram-Windows-x64-Portable.zip` | Standalone ZIP | x64 | **Portable**: Extract and run `Guidegram.exe` without installation |
| **macOS** | `Guidegram-1.1.0-universal.dmg` | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | `Guidegram-1.1.0.AppImage` | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---
*Built with ❤️ by DoctorGuidance*
