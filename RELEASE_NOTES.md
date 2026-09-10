# 🚀 Guidegram v1.6.0 — Official Telegram Desktop Parity & Infinite History Architecture

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, 64Gram & Telegraph Power Features, Hardware Anti-Fingerprinting, and Telegram Premium MTProto Capabilities.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.6.0</h3>
  <p><strong>Official Telegram Desktop Parity • Infinite History Scroll • Deep Dialog Pagination • Tiered Update Enforcement</strong></p>
</div>

---

## 🚀 Key Highlights & Architectural Overview

Guidegram v1.6.0 delivers full parity with the official **Telegram Desktop (TDesktop)** interface and protocol handling. This release addresses critical usability bottlenecks by introducing bidirectional infinite message history scrolling, deep dialog pagination for complete private chat visibility, an intelligent tiered update enforcement system, and comprehensive group statistics timeframe synchronization.

---

## 📦 What's New & Feature Enhancements

### 1. 📜 Infinite Chat History Scroll & Zero-Jitter Pagination
- **Continuous Message Pagination**: Scrolling to the top of any chat automatically retrieves historical messages in 50-item batches via MTProto `offsetId` pagination.
- **Scroll Jump Prevention**: Viewport scroll position is preserved seamlessly using height delta compensation (`newScrollHeight - prevScrollHeight + prevScrollTop`), allowing users to smoothly scroll back to the very first message in any conversation.
- **Dynamic Loader**: Displays an elegant top loading indicator while historical messages are being fetched.

### 2. 🗂️ Deep Dialog Loading & Infinite Chat List Scrolling
- **Extended Initial Depth**: Increased initial dialogs batch to **350** items (previously 150), resolving the issue where active channels and supergroups crowded out older private chats (PVs).
- **Infinite Scroll on Sidebar**: Scrolling near the bottom of the chat list automatically triggers chunked pagination using the timestamp of the oldest dialog (`offsetDate`), continuously populating the chat list with infinite scroll depth.
- **Deduplication Engine**: Merges new dialog batches into the local session map without ID collisions or re-render flickering.

### 3. 🛡️ Tiered Update Enforcement System
- **Mandatory Protocol & Security Updates**: Automatically detects Major/Minor version bumps (e.g. `v1.6.0`) and security/critical tags in release notes. For mandatory releases, dismissal buttons are suppressed, enforcing an in-app required update banner to maintain protocol safety and stability.
- **Session-Only Soft Dismissal**: Routine patch updates allow temporary dismissal for the active session, resurfacing upon the next application restart.
- **Visual Alert System**: Amber/rose glowing border with pulsing `ShieldAlert` badge for critical updates.

### 4. 📊 Group Statistics Timeframe Auto-Sync
- **Default to Today**: Group stats now correctly default to **Today** (امروز) instead of an incomplete one-week window.
- **Historical Periods Auto-Sync**: Switching between **Today**, **Yesterday**, **Past Week**, and **Past Month** dynamically checks if loaded history covers the timeframe and automatically queries MTProto server batches until the boundary timestamp is fully retrieved.
- **Timestamp Precision**: Fixed a millisecond/second double-division bug in `accountManager.ts`, ensuring accurate server-side historical filtering.

### 5. 🖥️ Official Telegram Desktop Interface Parity
- **Main Menu Drawer**: Complete parity with official Telegram Desktop including user avatar, full display name, @username, and quick access navigation.
- **My Profile Drawer**: Rich profile viewing including user biography, Telegram Star Gifts count, Data Center (DC) indicator, and Telegram Stars balance.
- **Unified Settings**: Deep configuration for storage usage, cache purge, download directory picker, privacy and security settings, message font size scaling, and keyboard shortcuts guide.

---

## 🐛 Bug Fixes & Reliability Improvements
- Fixed message history cutoff that prevented viewing older messages in active groups.
- Resolved private chat filtering limitation where only 1 DM was visible in busy accounts.
- Fixed historical timestamp resolution bug in `getHistoricalMessages`.
- Hardened single instance locking and breakaway updater launchers.

---

## 📊 Full Commit Log (v1.5.0...v1.6.0)
- `bc1a126` - chore(release): bump version to 1.6.0
- `4031a31` - fix(stats): default group stats to today and auto-fetch historical periods
- `b9d524e` - feat(chat): implement infinite history scroll and deep dialog pagination for desktop parity
- `a4a9587` - feat(updater): implement tiered update enforcement with mandatory security and protocol upgrades
- `7c1c70f` - feat(ui): complete Telegram Desktop parity for menu, profile, and settings

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong></p>
</div>
