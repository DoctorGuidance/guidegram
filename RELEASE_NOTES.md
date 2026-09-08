# 🚀 Guidegram v1.2.0 — Major UX & Media Evolution

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Per-Account Isolated Proxies, 64Gram & Telegraph Capabilities, and Hardware Anti-Fingerprinting.

---

### 🌟 What's New in v1.2.0

#### 🎬 Revamped Video Player & Streaming Architecture
- **Interactive Download Controller**: Direct pause, resume, and cancel capabilities during downloads.
- **Accurate Download Progress**: Live byte and percentage tracking (`MB / Total MB`) eliminating false 0-byte size reports.
- **Enhanced Player UI**: Integrated playback speed controls, seamless full-screen mode, and verified preview thumbnails.

#### 🖼️ Image & Media Rendering Reliability
- **Windows Path & Protocol Fix**: Corrected `guidegram-media://` protocol handler to properly handle drive letters and URL encoding without broken images.
- **High-Performance Direct Fallbacks**: Resilient multi-tier loading ensuring cached photos and media documents always render cleanly.

#### ✨ Premium & Custom Emojis Support
- **Custom Emoji Engine**: Unlocked rendering for animated and custom Telegram emoji packs without downgrading to plain Unicode characters.
- **Optimized Caching**: Cached document previews preventing redundant MTProto requests.

#### 🤖 Bot Inline Keyboards & Dedicated Menu
- **Isolated Glass Button Layout**: Bot inline buttons are now neatly separated beneath message containers.
- **Reliable Callback Dispatch**: Callback queries accurately forward row and column coordinates to bot backends.
- **Custom Bot Menu & Commands**: Direct access to bot web-apps and command lists right beside the message input.

#### 🔤 Modern Typography (Vazirmatn & Telegram Native)
- **Persian / Arabic Script**: Native integration of the elegant **Vazirmatn** font family with robust local fallbacks.
- **Latin Typography**: Balanced Open Sans & Segoe UI font stack mirroring Telegram Desktop's official reading experience.

#### 🔇 Muted Status & Unread Senders Counter
- **Muted Badge Coloring**: Quiet chats now display subtle neutral badges with mute indicators.
- **Distinct Sender Count**: Group dialog badges highlight both total unread messages and distinct contributor counts (e.g., `12 (3 نفر)`).

#### 📊 Comprehensive Group Analytics Modal
- **Detailed Group Statistics**: Deep analytics accessible for groups across Today, Yesterday, 1 Week, and 1 Month.
- **Top Contributors & Member Joins**: Identify most active members and track member join histories and invitation methods.
- **Hourly Activity & Word Clouds**: Visual breakdown of peak discussion hours, message volume, and most popular keywords and emojis.

---

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Guidegram-Windows-x64-Portable.zip | Standalone ZIP | x64 | **Portable**: Extract and run Guidegram.exe without installation |
| **macOS** | Guidegram-1.2.0-universal.dmg | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | Guidegram-1.2.0.AppImage | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---
*Built with 🤍 by DoctorGuidance*
