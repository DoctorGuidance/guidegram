# 🚀 Guidegram v1.6.1 — Robust SemVer Updater Engine & Ecosystem Polish

> **Next-Generation Portable Desktop Telegram Client** with Unlimited Multi-Account, Dedicated Per-Account Proxies, Advanced Power Preferences, Hardware Anti-Fingerprinting, and Telegram Premium MTProto Capabilities.

---

<div align="center">
  <img src="resources/guidegram_logo_transparent.png" alt="Guidegram Logo" width="150" height="150" />
  <h3>Guidegram v1.6.1</h3>
  <p><strong>Robust SemVer Updater Engine • Automated Release Promotion • Attractiveness Hierarchy Documentation • Production Stability</strong></p>
</div>

---

## 🚀 Key Highlights & Architectural Overview

Guidegram v1.6.1 is a targeted stability and engine hardening release following the milestone v1.6.0 release. It introduces an advanced SemVer-aware release detection mechanism that immunizes the in-app auto-updater against GitHub API timestamp anomalies, incorporates automated release flag promotion, and provides a comprehensive documentation overhaul reflecting user discovery priorities.

---

## 📦 What's New & Enhancements

### 1. 🛡️ Resilient SemVer-Driven Release Detection
- **Multi-Level Version Parsing**: The in-app `updateManager.ts` engine now queries the complete roster of repository releases from GitHub API and deterministically sorts them in descending order using rigorous Semantic Versioning (`major.minor.patch`).
- **Timestamp Race Immunity**: Eliminates dependency on GitHub's native `/releases/latest` endpoint, preventing scenarios where asynchronous parallel CI builds could cause older tags to temporarily shadow newer releases.
- **Graceful Multi-Stage Fallback**: Retains automatic fallback to `/releases/latest` should the release array endpoint experience intermittent network throttling or proxy interruptions.

### 2. 🤖 Automated Latest Release Promotion Pipeline
- **GitHub Actions Release Hardener**: Added `ensure-latest-release.yml` workflow and enforced `make_latest: true` in the core release pipeline to guarantee that the primary repository endpoint is synchronized with the absolute latest stable release.

### 3. 📖 Product Discovery & Attractiveness Hierarchy
- **Complete README Overhaul**: Restructured the project documentation around user value and attraction:
  1. *Unlimited Multi-Account Dock* (Bypassing 3-account limit)
  2. *Dedicated & Isolated Per-Account Proxies* (Zero ban risk)
  3. *Hardware Anti-Fingerprinting & Device Identity Spoofing*
  4. *100% Truly Portable & Self-Contained Architecture*
  5. *Parallel Chunk Download Acceleration* (Up to 3x faster)
  6. *Deep Group Statistics & Member Activity Intelligence* (Exclusive to Guidegram)
  7. *Ghost Mode & Stealth Stories Viewer*

---

## 🐛 Bug Fixes & Refinements
- Fixed potential version misdetection in `fetchLatestRelease` when multiple release jobs finish closely.
- Sanitized internal mod naming and branding across UI and documentation.
- Retained full suite of v1.6.0 features including infinite history scroll, deep dialog pagination (350+ items), and group stats auto-sync.

---

## 📊 Full Commit Log (v1.6.0...v1.6.1)
- `8933ccc` - docs(readme): reorder features by maximum user appeal led by unlimited multi-account dock
- `de7ec51` - fix(updater): ensure robust semver release selection and promote v1.6.0 as latest

---

<div align="center">
  <p>Crafted with precision by <strong>DoctorGuidance</strong></p>
</div>
