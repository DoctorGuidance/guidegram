# 🚀 Guidegram v1.1.1 — Hotfix & UX Polish

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Per-Account Isolated Proxies, 64Gram & Telegraph Capabilities, and Hardware Anti-Fingerprinting.

---

### 🌟 What's New in v1.1.1

#### 🖼️ Official 3D Metallic Neon Logo
- **Unified Branding & Icon Consistency**: Replaced legacy draft vector icons with the official 3D cyber metallic "G" neon cyan logo (`src/assets/logo.png`) across all application surfaces: Windows executable metadata, window frame, Taskbar, and System Tray.

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

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Guidegram-Windows-x64-Portable.zip | Standalone ZIP | x64 | **Portable**: Extract and run Guidegram.exe without installation |
| **macOS** | Guidegram-1.1.1-universal.dmg | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | Guidegram-1.1.1.AppImage | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---
*Built with 🤍 by DoctorGuidance*
