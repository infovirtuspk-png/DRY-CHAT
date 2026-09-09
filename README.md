<div align="center">

# 🔐 DRY CHAT

### Advanced Private Realtime Windows Desktop Messaging Application

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-v34-brightgreen.svg)

**Modern, Private, Secure, Realtime Desktop Messaging for Windows**

[![Download](https://img.shields.io/badge/Download-Installer-red.svg)](https://github.com/infovirtuspk-png/DRY-CHAT/releases/download/1.0/Dry.Chat.Setup.1.0.0.exe)
[![Portable](https://img.shields.io/badge/Download-Portable-orange.svg)](https://github.com/infovirtuspk-png/DRY-CHAT/releases/download/1.0/Dry.Chat.1.0.0.exe)

</div>

---

## 🌟 Overview

**Dry Chat** is a modern, private, secure, and realtime Windows desktop messaging application engineered for Windows 10 and Windows 11 (64-bit systems). It features a local-first SQLite persistence engine, Firebase Realtime Database for instant synchronization and presence, Cloudinary for ephemeral 10-second remote media transport, and permanent local storage managed in `%USERPROFILE%\Documents\Dry Chat\`.

> [!IMPORTANT]
> **Strict Messaging-Only Architecture**: Dry Chat contains **zero calling functionality** (no voice, audio, or video calling components, buttons, or WebRTC infrastructure).

---

## ✨ Key Features

- 🔐 **13-Digit User ID Identity**: Every account receives a cryptographically secure, unique 13-digit identifier (e.g. `1038472916502`)
- 🛡️ **Anti-Enumeration Search Privacy**: Public user discovery is restricted to exact 13-digit ID searches, completely preventing directory scraping
- 💾 **Local-First SQLite Persistence**: Instant optimistic UI rendering with an automated 7-phase migration engine
- ⏱️ **Ephemeral 10-Second Media Transport**: Uploaded media transfers via Cloudinary and automatically schedules server-side remote asset deletion 10 seconds after availability, while permanent copies reside securely on the user's PC
- 📁 **Windows Local Storage**: Managed file storage under `Documents/Dry Chat/{Images, Videos, Files, Avatars, Cache, Database, Logs}`
- 🎨 **7 Modern Themes**: CSS variable-driven design system featuring Dark, Light, Midnight, Ocean, Purple, Emerald, and Sunset themes
- 🪟 **Frameless Windows Custom Titlebar**: Native-like custom title bar with window control integration (minimize, maximize, close) and live connectivity pill
- 🔄 **Offline Sync Engine**: Queues outgoing messages and status updates with exponential backoff retry
- 💬 **Rich Messaging**: Markdown rendering, replies, reactions (👍, ❤️, 😂, 🔥), stars, edits, forwarding, and in-chat/global search

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Framework** | Electron.js v34 (x64) | Secure multi-process architecture with Context Isolation |
| **Backend / Main** | Node.js v24 | SQLite, local FS manager, Cloudinary ephemeral deletion |
| **Database** | SQLite + `sql.js` (WebAssembly) | Local persistence, WAL mode, migrations, sync queue |
| **Realtime / Auth** | Firebase Realtime DB & Auth | Presence, typing indicators, delivery & read receipts |
| **Media Transport** | Cloudinary API | 10-second ephemeral cloud transport |
| **Frontend UI** | HTML5, CSS3, ES6+ Modular JS | Bootstrap 5, Bootstrap Icons, CSS variable design system |

---

## 📁 Directory Structure

```
g:\App\DC\
├── src/
│   ├── main/
│   │   ├── main.js                     # Electron main entry & window lifecycle
│   │   ├── config.js                   # App configuration & .env loader
│   │   ├── database/                   # SQLite engine, migrator, and repositories
│   │   ├── services/                   # Firebase, Cloudinary, Sync, Presence, Notifications
│   │   ├── ipc/                        # Secure IPC handlers for Auth, Chat, Messages, Media
│   │   └── utils/                      # 13-digit generator, Logger, Security sanitizers
│   ├── preload/
│   │   └── preload.js                  # contextBridge (window.dryChat.*)
│   └── renderer/
│       ├── index.html                  # Main application structure
│       ├── css/                        # Themes (7 themes), Titlebar, App, Components
│       ├── js/                         # State store & UI component controllers
│       └── assets/                     # SVG Icons, Logos, and branding assets
├── database/
│   ├── schema.sql                      # Master SQLite schema
│   └── migrations/                     # 001_initial to 007_sync SQL migrations
├── firebase/
│   └── database.rules.json             # Enforced RTDB Security Rules
├── tests/
│   └── run-tests.js                    # Automated test suite (23 test cases)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js LTS (v20+ or v24)
- Windows 10 / 11 (64-bit)

### Installation & Running Locally
```powershell
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Launch Dry Chat desktop app
npm start
```

---

## 📦 Download Installer

<div align="center">

### 🎯 Latest Release: Version 1.0.0

[![Download Installer](https://img.shields.io/badge/Download-Setup-Installer-red.svg?style=for-the-badge)](https://github.com/infovirtuspk-png/DRY-CHAT/releases/download/1.0/Dry.Chat.Setup.1.0.0.exe)
[![Download Portable](https://img.shields.io/badge/Download-Portable-Version-orange.svg?style=for-the-badge)](https://github.com/infovirtuspk-png/DRY-CHAT/releases/download/1.0/Dry.Chat.1.0.0.exe)

#### 📥 Download Options

| Version | Size | SHA256 | Type |
|--------|------|--------|------|
| **Dry.Chat.Setup.1.0.0.exe** | 96.8 MB | `e923eacc43f7ae72798f299e0058edd90a188f8964ba791df8729be7be9b709d` | [Setup Installer](https://github.com/infovirtuspk-png/DRY-CHAT/releases/download/1.0/Dry.Chat.Setup.1.0.0.exe) |
| **Dry.Chat.1.0.0.exe** | 96.6 MB | N/A | [Portable Version](https://github.com/infovirtuspk-png/DRY-CHAT/releases/download/1.0/Dry.Chat.1.0.0.exe) |

> [!NOTE]
> **Setup Installer (Recommended)**: Full NSIS installer with automatic setup and configuration
> **Portable Version**: Standalone portable version - no installation required

</div>

---

## 🔧 Windows Packaging

To package Dry Chat into a Windows NSIS installer and portable executable:
```powershell
npm run build
```
Output binaries will be generated in `dist/`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Search 13-Digit ID / New Chat |
| `Ctrl + Shift + N` | Create New Group |
| `Ctrl + ,` | Open Settings |
| `Enter` | Send Message (when enabled in settings) |
| `Shift + Enter` | New Line |
| `Esc` | Close Modals / Media Viewer |

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">

**Built with ❤️ using Electron.js**

Made with [Devin](https://devin.ai)

</div>