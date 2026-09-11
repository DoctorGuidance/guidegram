# 🚀 Guidegram v1.6.2 — Zero-Loss In-Place Upgrade Shield & Welcome Screen Highlights

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, Advanced Power Preferences, Hardware Anti-Fingerprinting, and Telegram Premium MTProto Capabilities.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.6.2</h3>
  <p><strong>Zero-Loss In-Place Upgrade Shield • Pre-Install Data Snapshots • Killer Feature Discovery • Packaging Integrity</strong></p>
</div>

---

## 🚀 Key Highlights & Architectural Overview

Guidegram v1.6.2 introduces a multi-tier data protection shield in the Windows installer engine. It guarantees 100% zero data loss when installing or upgrading into an existing directory, immunizing existing user accounts, sessions, and preferences against legacy uninstaller behaviors. Additionally, the first-run welcome screen highlights Guidegram's top killer features for immediate discovery.

---

## 📦 What's New & Enhancements

### 1. 🛡️ Multi-Tier In-Place Upgrade Shield (`resources/installer.nsh`)
- **Pre-Install Data Snapshot (`customInit` & `setIsTryToKeepShortcuts`)**: Before any legacy uninstaller or file extraction can run, the installer automatically detects existing `data/` and creates pre-flight snapshots in both `$TEMP` and `%APPDATA%\Guidegram\safe_backup`.
- **Automatic Post-Extraction Restoration (`customInstall`)**: Once new application binaries are extracted, the installer inspects `$INSTDIR\data\config.json`. If missing or wiped by an older uninstaller version, all configs and session files are restored instantly from the snapshot.
- **Surgical Uninstaller Protection (`customRemoveFiles`)**: Prevents recursive deletion of `$INSTDIR`. Only application binaries, dlls, and resources are uninstalled, leaving user sessions, caches, and accounts completely intact.

### 2. 🌟 Welcome Screen Feature Showcase
- **Top 4 Killer Features Highlighted**: The first-run onboarding screen prominently features:
  1. *Unlimited Multi-Account Dock* (Bypass Telegram's 3-account limit)
  2. *Dedicated Per-Account Proxies* (Isolated proxy routing for zero ban risk)
  3. *Deep Group Statistics & Analytics* (Historical metrics exclusive to Guidegram)
  4. *Hardware Anti-Fingerprinting Shield* (Hardware spoofing and stealth protection)

### 3. 📦 Packaging Configuration Polish
- Added `package.json` to electron-builder files bundle for seamless asar integrity verification across all platforms.

---

## 🐛 Bug Fixes & Refinements
- Fixed an issue where installing into an existing installation directory could cause older uninstaller scripts to wipe the `data/` folder.
- Verified and expanded Milestone 11 test suite with 15 passing assertions covering all installer shield macros.
- Passed full test suite across all 17 milestones (Milestone 1 to 17).

---

## 📊 Full Commit Log (v1.6.1...v1.6.2)
- `feat(ui): highlight top 4 killer features on welcome screen`
- `fix(installer): implement pre-install snapshot and zero-loss in-place upgrade shield`

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong></p>
</div>
