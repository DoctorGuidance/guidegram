# 🚀 Guidegram v1.2.2 — Telegram Premium Animation, Profile Power & Schema Evolution

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Per-Account Isolated Proxies, 64Gram & Telegraph Capabilities, and Hardware Anti-Fingerprinting.

---

### 🌟 What's New in v1.2.2

Guidegram v1.2.2 introduces full Telegram Premium visual fidelity with 60fps animated custom emojis, dynamic profile power cards, and seamless background tray docking.

#### ✨ Telegram Premium Animated Custom Emojis (TGS Lottie Engine)
- **Native Vector Lottie Rendering**: Integrated `lottie-web` with an automated on-the-fly GZIP stream decompressor for Telegram's `.tgs` animated sticker/emoji payloads.
- **Direct MTProto Emoji Resolution**: Animated custom emojis in chat texts, status badges, and messages now play fluid 60fps vector animations with memory-efficient looping.
- **Smart Format Routing**: Seamlessly handles animated TGS Lottie, MP4 video emojis, and WebP raster stickers with zero broken image placeholders.

#### ⭐ Premium Emoji Status & Profile Intelligence
- **Real-Time Emoji Status Badge**: Displays the user's active custom emoji status badge next to their display name across both the Chat List dialog items and the active Chat Viewport header.
- **Personal Channel Integration**: Displays user-pinned personal channels directly within the Profile Drawer with one-click external preview and navigation.
- **Star Gifts Count Badge**: Live display of received Telegram Stars gift count with custom star gift badge.
- **Birthday Indicator**: Displays birth date on user profile cards directly from the MTProto `UserFull` entity.

#### 📥 System Tray Docking & Minimization
- **Clean Taskbar Minimization**: Minimizing the main window docks the application directly to the Windows System Tray ("Show hidden icons" area) with instant single-click restoration.

#### 🧠 Telegram MTProto Master Reference & Coverage Skill
- **Comprehensive MTProto API Directory**: Created the official `telegram-mtproto-api` skill mapping all 23 MTProto namespaces and 968 functions.
- **Automated Implementation Analyzer**: Built `analyze_coverage.py` providing real-time auditing of implemented vs available Telegram MTProto RPC endpoints.

---

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Guidegram-Windows-x64-Portable.zip | Standalone ZIP | x64 | **Portable**: Extract and run Guidegram.exe without installation |
| **macOS** | Guidegram-1.2.2-universal.dmg | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | Guidegram-1.2.2.AppImage | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---
*Built with 🤍 by DoctorGuidance*
