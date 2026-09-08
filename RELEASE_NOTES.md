# 🚀 Guidegram v1.2.1 — Seamless Updater & Media Evolution

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Per-Account Isolated Proxies, 64Gram & Telegraph Capabilities, and Hardware Anti-Fingerprinting.

---

### 🌟 What's New in v1.2.1 (Hotfix & Updater Stabilization)

This release delivers critical fixes to the in-app portable updater engine, eliminating Windows file-locking collisions and guaranteeing seamless, zero-friction updates for all users.

#### 🔄 Ultra-Resilient Portable Updater
- **Automated Process Cleanup**: Forcefully terminates lingering Electron GPU, utility, and worker background processes prior to extraction.
- **Pre-Extraction File Lock Verification**: Implements real-time .NET stream handle checks on `Guidegram.exe` to completely prevent Windows `Access Denied` (file in use) errors.
- **Atomic File-by-File Extraction**: Safely unpacks update files one by one with overwrite enforcement while strictly isolating and preserving user sessions in `data/`.
- **Guaranteed Automatic Relaunch**: Smoothly relaunches the updated `Guidegram.exe` immediately after file extraction completes without requiring manual intervention.
- **Dynamic In-App Versioning**: Fixed title bar, settings, and drawer version labels to accurately synchronize from build metadata.

*(For media player revamps, custom emoji rendering, bot inline buttons, Persian typography, and group analytics, refer to the [v1.2.0 Release Notes](https://github.com/DoctorGuidance/guidegram/releases/tag/v1.2.0).)*

---

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Guidegram-Windows-x64-Portable.zip | Standalone ZIP | x64 | **Portable**: Extract and run Guidegram.exe without installation |
| **macOS** | Guidegram-1.2.1-universal.dmg | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | Guidegram-1.2.1.AppImage | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---
*Built with 🤍 by DoctorGuidance*
