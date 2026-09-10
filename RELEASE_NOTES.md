# 🚀 Guidegram v1.2.5 — Global Search, Entity Formatting, Bilingual i18n & Portable Sync

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, 64Gram & Telegraph Power Features, Hardware Anti-Fingerprinting, and Telegram Premium Custom Emojis.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.2.5</h3>
  <p><strong>Global MTProto Search • Full Entity Formatting Engine • Robust Bot Callbacks • Bilingual i18n • Portable Sync</strong></p>
</div>

---

### 🌟 What's New in v1.2.5

Guidegram v1.2.5 delivers a comprehensive suite of high-priority features, bug fixes, and architectural improvements addressing user feedback across search, bot interactions, localization, entity rendering, and settings parity with official Telegram Desktop.

---

#### 🔍 1. Global Telegram Search & Filter Tabs
- **Global Public Peers (`contacts.search`)**: Search for public channels, supergroups, and users directly across Telegram servers (e.g. `@sartusar`).
- **Global Message Search (`messages.searchGlobal`)**: Search across all public messages and hashtags (e.g. `#music`, `#news`) with search keyword highlighting.
- **TDesktop Filter Tabs**: Quick category filters (`All chats`, `Channels`, `Groups`, `Private chats`, `From archive`) for precision searching.

#### ⚡ 2. Full Telegram Entity Formatting Engine (Markdown Parity)
- **UTF-16 Range Parser**: Complete in-memory entity range tree supporting native Telegram MTProto formatting offsets:
  - **Bold** (`MessageEntityBold`)
  - *Italic* (`MessageEntityItalic`)
  - <u>Underline</u> (`MessageEntityUnderline`)
  - ~~Strikethrough~~ (`MessageEntityStrike`)
  - ⬛ **Spoiler** (`MessageEntitySpoiler` with interactive click-to-reveal animation)
  - ❝ **Blockquote** (`MessageEntityBlockquote` with elegant quotation styling)
  - 🔗 **Hyperlinks** (`MessageEntityTextUrl`)
  - 🏷️ **Hashtags & Mentions** (`#tag`, `@username`)
  - 💻 **Code Blocks & Inline Monospace** (`MessageEntityCode`, `MessageEntityPre`)

#### 🤖 3. Resilient Bot Inline Buttons MTProto Engine
- **Fix for `RPCError: 400: DATA_INVALID`**: Eliminates encoding corruption when handling arbitrary binary inline button callbacks.
- **Binary Buffer Cache & Base64 Transmission**: Preserves exact byte streams between Electron and GramJS, invoking `messages.GetBotCallbackAnswer` directly with authenticated buffers.

#### 🌐 4. Full Bilingual Localization (English / فارسی)
- **Unified i18n Architecture**: Zero hardcoded strings across dialog lists, headers, modals, and settings.
- **Dynamic RTL / LTR & Typography**: Seamlessly toggles document direction and switches between Persian `Vazirmatn` and English `Open Sans / Inter`.
- **Localized Numbers & Counts**: Intelligent pluralization and numeral formatting (e.g. `3 (1 person)` in English vs `۳ (۱ نفر)` in Persian).

#### ⌨️ 5. Priority Escape Key Navigation
- **Hierarchical Dismissal Stack**:
  1. Closes topmost open modals (Settings, Direct Forward, Add Account, Confirm).
  2. Clears active search queries.
  3. Closes Unified Inbox.
  4. Deselects active chat and returns to idle state (identical to Telegram Desktop).

#### 📊 6. Deep Historical Group Statistics
- **Server Historical Fetcher (`getHistoricalMessages`)**: Eliminates the 40-message RAM cache limitation by fetching older messages from Telegram in 200-message batches.
- **Full Date Range Analytics**: Accurate analysis for Today, Yesterday, Last 7 Days, and Last 30 Days.
- **Progressive History Banner**: Shows total analyzed messages with 1-click deeper history loading.

#### ⚙️ 7. Telegram Desktop (tdesktop) Settings Parity
- **Sidebar Tabbed Navigation**:
  - **My Profile**: Connected accounts, phone numbers, and session management.
  - **General**: Live language switcher (English / فارسی) and window close behavior (Ask / Minimize / Quit).
  - **Notifications & Sounds**: Desktop notifications and sound toggles.
  - **Privacy & Security**: Ghost Mode (حالت روح), Multi-Account Anti-Fingerprinting, and default double-sided delete.
  - **Chat Settings**: Chat ID badge, Message ID pill, timestamp seconds, sender avatars in groups, and link warning controls.
  - **Advanced & Storage**: Portable storage path, portable sync engine, software updates, and live system log viewer.

#### 🗄️ 8. Portable Installation Locator & Sync Engine
- **Automatic Portable Registration**: Portable builds register their location at `%APPDATA%\Guidegram\portable_locator.json`.
- **Installer Upgrade Parity**: Setup installer editions automatically detect existing portable data and provide a 1-click **"Sync & Import from Portable"** action to migrate sessions without data loss.

#### 💎 9. Cross-Chat Premium Custom Emojis
- **Universal Custom Emoji Support**: Ensures vector TGS Lottie custom emojis render properly across bot chats, supergroups, direct messages, and channels.

---

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | `Guidegram-Windows-x64-Portable.zip` | Standalone ZIP | x64 | **Portable**: Extract anywhere (folder or USB) and run `Guidegram.exe` |
| **Windows** | `Guidegram-Setup-1.2.5.exe` | NSIS Installer | x64 | Standard Windows Setup installer with desktop shortcuts |
| **macOS** | `Guidegram-1.2.5-universal.dmg` | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | `Guidegram-1.2.5.AppImage` | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---

### 🛡️ Portability & Privacy Guarantee
All session tokens, encryption keys, proxies, and accounts remain stored exclusively in your local `./data` folder adjacent to `Guidegram.exe`. No registry keys, no AppData pollution, zero cloud tracking.

---
*Built with 🤍 by DoctorGuidance*
