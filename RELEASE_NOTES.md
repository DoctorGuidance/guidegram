# 🚀 Guidegram v1.7.0 — Lightning Atomic Updater & Brand Refresh

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, Advanced Power Preferences, Hardware Anti-Fingerprinting, and Telegram Premium MTProto Capabilities.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.7.0</h3>
  <p><strong>Lightning Atomic Updater • What's New Celebration • Brand Refresh • Resilient QR Auth • Zero Data Loss</strong></p>
</div>

---

## 🚀 Key Highlights & Architectural Overview

Guidegram v1.7.0 introduces a state-of-the-art **Lightning Atomic Updater** system alongside a celebratory post-update onboarding modal, refreshed brand identity aligned with our modern mint-teal color palette, and rock-solid QR authentication resilience.

---

## 📦 What's New & Enhancements

### 1. ⚡ Lightning Atomic Updater & Post-Update Celebration
- **Atomic In-Place Update Execution**: Streamlined updater engine with pre-flight sanitization, automated background binary verification, and seamless restart execution.
- **"What's New" Celebration Modal**: Beautiful, native celebration dialog welcoming users after each successful update, highlighting fresh capabilities and release highlights.
- **Resilient Update Markers**: Hardened UTF-8 marker persistence with BOM protection and robust schema validation across process lifecycles.

### 2. 🎨 Brand Identity & Theme Refresh
- **Mint-Teal Brand Palette Alignment**: Complete UI color palette harmonization reflecting the official Guidegram logo mint-teal accents.
- **Enhanced Visual Hierarchy**: Refined guest drawer menus, eliminated legacy mock badges, and elevated high-contrast action buttons for optimal legibility.

### 3. 🔐 Hardened Authentication & Channel Sync
- **Resilient QR Authentication**: Enhanced MTProto QR code login flow with automatic refresh cycles and timeout handling.
- **Broadcast Channel Notification Sync**: Resolved edge-cases in broadcast channel mute state detection and synchronized server-side notify settings accurately.

### 4. 🌐 Organization Infrastructure Transition
- Fully updated repository endpoints, release assets, and telemetry references to the official `guidegram` GitHub organization.

---

## 🐛 Bug Fixes & Stability Improvements
- **fix(notifications)**: Corrected broadcast channel mute state detection and synchronized server-side notify settings accurately.
- **fix(updater)**: Sanitized update marker parsing to handle clean UTF-8 encoding without BOM artefacts.
- **fix(ui)**: Cleaned up guest drawer menu hierarchy and eliminated legacy mock badges.
- **refactor**: Updated repository URLs and download links to point to the `guidegram` organization.

---

## 📊 Full Commit Log (v1.6.2...v1.7.0)
- `154acff` - `refactor: update repository links and release owner to guidegram organization`
- `8e18658` - `fix(notifications): correct broadcast channel mute detection and notify settings sync`
- `f338f30` - `fix(updater): sanitize update marker parsing and UTF-8 encoding without BOM`
- `ac80265` - `feat(updater): implement lightning atomic updater, what's new celebration modal, and resilient QR auth`
- `ea8ef19` - `fix(ui): eliminate mock badges and refine guest drawer menu hierarchy`
- `39056de` - `feat(ui): align brand colors with logo mint-teal palette and enhance connect button contrast`

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong> & the <strong>Guidegram Team</strong></p>
</div>
