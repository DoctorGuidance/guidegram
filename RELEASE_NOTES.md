# 🚀 Guidegram v1.2.4 — Official Brand Identity & Multi-Resolution Icon Suite

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, 64Gram & Telegraph Power Features, Hardware Anti-Fingerprinting, and Telegram Premium Custom Emojis.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="160" height="160" />
  <h3>Guidegram v1.2.4</h3>
  <p><strong>Clean Mint-Teal Brand Identity • High-DPI Windows Icon Suite • Dynamic Updater Synchronization</strong></p>
</div>

---

### 🌟 What's New in v1.2.4

Guidegram v1.2.4 introduces the official brand identity, an overhaul of all application visual assets across Windows, macOS, and Linux, and seamless integration of high-resolution icon pipelines.

#### 🎨 Official Mint-Teal Brand Identity & Logo Architecture
- **Supersonic Monogram & Mint-Teal Squircle Tile**: Official emblem featuring the distinctive `G` monogram seamlessly merged with a soaring paper airplane against a modern mint-teal canvas (`#34cca2`).
- **Anti-Aliased Corner Transparency**: Outer white backgrounds from raw assets are cleanly removed with connected-component alpha segmentation, guaranteeing pristine presentation on both dark and light Windows taskbars, window frames, and desktop backgrounds.
- **Unified Asset Repository**:
  - `src/assets/logo.png`, `src/assets/icon.png`, and `src/assets/icon.ico` for in-app React interfaces (TitleBar, WelcomeScreen, Modals).
  - `public/favicon.ico` and `public/logo.png` for web and dev viewports.
  - `resources/guidegram_logo_transparent.png` (512×512) and `resources/icon512.png`.

#### 🪟 Windows High-DPI Multi-Layer Icon Pipeline (`icon.ico`)
- **Native PE Resource Injection**: The Windows executable (`Guidegram.exe`) now embeds an authentic multi-resolution Windows ICO container with 7 distinct resolution layers (16×16, 24×24, 32×32, 48×48, 64×64, 128×128, and 256×256).
- **Subtle Unsharp Masking**: Custom filtering applied to 16px and 32px frames prevents loss of fine aerodynamic lines, ensuring the airplane silhouette remains razor-sharp even on compact displays.
- **Embedded Fallback Icon**: Electron main process fallback data URL updated to match the new 32px brand icon.

#### 🔄 Dynamic Version Synchronization & Inline Software Updates
- **Zero Cache Lag**: Settings interface directly queries the runtime Electron process via IPC (`app:get-version`), preventing static web bundler cache mismatches.
- **Inline Updater Controls**: Direct 1-click update action with live download chunk progress bar and safe automated extraction that preserves all local `./data` sessions and credentials.

#### 💎 Telegram Premium Animated Custom Emojis
- **TGS / Lottie Vector Animation**: In-memory decompression of Telegram `.tgs` gzip streams into JSON vectors rendered via `lottie-web`.
- **Custom Emoji Status**: Real-time display of user and channel premium emoji status badges beside chat titles.
- **Profile Power Cards**: Personal channel cards, Star gift count badges, and birthday info integrated into the user profile view.

---

### 📦 Available Release Packages

| Platform | Package File | Type | Architecture | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | `Guidegram-Windows-x64-Portable.zip` | Standalone ZIP | x64 | **Portable**: Extract anywhere (folder or USB) and run `Guidegram.exe` |
| **Windows** | `Guidegram-Setup-1.2.4.exe` | NSIS Installer | x64 | Standard Windows Setup installer with desktop shortcuts |
| **macOS** | `Guidegram-1.2.4-universal.dmg` | DMG Installer | Universal (Intel & Apple Silicon) | Drag-and-drop installer for macOS 11+ |
| **Linux** | `Guidegram-1.2.4.AppImage` | AppImage | x86_64 | Self-contained executable for all Linux distributions |

---

### 🛡️ Portability & Privacy Guarantee
All session tokens, encryption keys, proxies, and accounts remain stored exclusively in your local `./data` folder adjacent to `Guidegram.exe`. No registry keys, no AppData pollution, zero cloud tracking.

---
*Built with 🤍 by DoctorGuidance*
