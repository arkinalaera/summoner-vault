# LoL Account Manager 🎮

A powerful desktop application to manage multiple League of Legends accounts, track ranked progression, and automate game client interactions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## 📋 Table of Contents

- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Riot API Key](#-riot-api-key)
- [Technologies](#-technologies)
- [Development](#-development)
- [Building](#-building)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Account Management
- 📁 **Store Multiple Accounts**: Manage unlimited League of Legends accounts with credentials
- 🔍 **Search & Filter**: Find accounts quickly by name, rank, or region
- 📊 **Rank Tracking**: Automatic synchronization of Solo Queue and Flex Queue ranks
- 🌍 **Multi-Region Support**: All Riot regions (EUW, EUNE, NA, KR, BR, LAN, LAS, OCE, JP, RU, TR)
- 📝 **Notes**: Add custom notes to each account
- 🎨 **Visual Rank Badges**: Beautiful rank icons from Iron to Challenger

### Automation
- 🚀 **One-Click Login**: Automated account switching with credential auto-fill
- ✅ **Auto-Accept Matches**: Automatically accept queue pop using LCU API
- 🔄 **Auto-Refresh**: Ranks update automatically on startup (with smart caching)
- ⏱️ **Rate Limiting**: Built-in request throttling to respect Riot API limits

### User Interface
- 🌙 **Dark Theme**: Eye-friendly dark mode optimized for gaming
- 🖱️ **Drag & Drop**: Reorder accounts by dragging
- 🔔 **Real-time Status**: Live login status and match queue notifications
- 📱 **Responsive Design**: Modern UI built with React and Tailwind CSS
- 🗂️ **System Tray**: Minimize to tray instead of closing

### Performance & Security
- 💾 **Local Storage**: All data stored locally, no cloud/external servers
- 🔒 **Encrypted Credentials**: Account passwords stored securely
- ⚡ **Smart Caching**: 1-hour cache to minimize API calls
- 🔑 **Custom API Keys**: Use your own Riot API key to avoid rate limits

## 📸 Screenshots

> Coming soon

## 📥 Installation

### Download Pre-built Binary

1. Go to [Releases](https://github.com/yourusername/lol-account-manager/releases)
2. Download the latest version for your platform:
   - Windows: `LoL-Account-Manager-Setup.exe`
   - macOS: `LoL-Account-Manager.dmg`
   - Linux: `LoL-Account-Manager.AppImage`
3. Run the installer and follow the instructions

### Build from Source

See [Development](#-development) section below.

## ⚙️ Configuration

### First Launch

On first startup, you'll be greeted with a welcome dialog asking for:

1. **Riot API Key** (optional but recommended)
   - Get a free key at [developer.riotgames.com](https://developer.riotgames.com/)
   - Development key: Free, expires every 24 hours
   - Production key: Permanent, requires approval

2. **League of Legends Path**
   - Navigate to Settings and select `RiotClientServices.exe`
   - Usually located at: `C:\Riot Games\Riot Client\RiotClientServices.exe`

### Settings

Access settings via the ⚙️ icon in the top-right corner:

- **Riot Client Path**: Path to RiotClientServices.exe (required for auto-login)
- **Riot API Key**: Your personal API key (optional)

## 🎮 Usage

### Adding Accounts

1. Click **"Add Account"** button
2. Fill in the form:
   - **Account Name**: Display name (e.g., "Main Account")
   - **Riot ID**: Your Riot ID (e.g., "PlayerName#EUW")
   - **Region**: Select your region
   - **Login/Password**: Game credentials (for auto-login)
   - **Notes**: Optional notes
3. Click **"Save"**
4. The app will automatically fetch rank data from Riot API

### Managing Accounts

- **Edit**: Click the edit icon on any account card
- **Delete**: Click the trash icon to remove an account
- **Login**: Click "Login" to automatically log into the game
- **Search**: Use the search bar to filter by name
- **Filter**: Filter by rank or region using dropdowns
- **Reorder**: Drag and drop accounts to reorder them

### Auto-Accept Matches

1. Check the **"Auto Accept"** checkbox in the header
2. When a match is found, the app will automatically accept it
3. Works in the background, even when minimized to tray

### Refreshing Ranks

- **Automatic**: Ranks refresh on startup (if older than 1 hour)
- **Manual**: Click the 🔄 refresh button to force update all accounts

## 🔑 Riot API Key

### Why do I need an API key?

The app uses Riot Games API to fetch:
- Summoner profile data (icon, level)
- Ranked statistics (tier, division, LP, games)
- Match history metadata

### Getting an API Key

#### Option 1: Development Key (Quick)
1. Go to [developer.riotgames.com](https://developer.riotgames.com/)
2. Sign in with your Riot account
3. Copy your development key
4. ⚠️ **Expires every 24 hours**

#### Option 2: Production Key (Recommended)
1. Go to [developer.riotgames.com](https://developer.riotgames.com/)
2. Click **"Register Product"**
3. Fill out the application form:
   - **App Name**: LoL Account Manager
   - **Description**: Use the description from this README
   - **Type**: Personal/Non-Commercial
4. Wait for approval (1-2 weeks)
5. ✅ **Permanent key with higher rate limits**

### Using Your API Key

1. Open **Settings** (⚙️ icon)
2. Enter your API key in the **"Riot API Key"** field
3. The app will automatically use your key for all requests

**Without a custom key**: The app uses a shared default key with lower limits.

## 🛠️ Technologies

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Vite** - Build tool

### Backend/Desktop
- **Electron** - Desktop framework
- **Node.js** - Runtime environment
- **@nut-tree-fork/nut-js** - Keyboard/mouse automation
- **axios** - HTTP client

### APIs
- **Riot Games API** - Account data, ranks, match history
- **League Client Update (LCU) API** - Game client automation
- **Data Dragon** - Champion icons, rank badges

## 💻 Development

### Prerequisites

- **Node.js** 18+ and npm
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/lol-account-manager.git
cd lol-account-manager

# Install dependencies
npm install

# Start development server (web preview)
npm run dev

# Start Electron app in development mode
npm run electron:dev
```

### Project Structure

```
summoner-vault/
├── src/
│   ├── components/       # React components
│   ├── lib/             # Utilities (riot-api, storage)
│   ├── pages/           # Page components
│   ├── types/           # TypeScript types
│   └── main.tsx         # React entry point
├── electron-main.cjs    # Electron main process
├── preload.cjs          # Electron preload script
├── login-manager.cjs    # Auto-login automation
├── ready-check.cjs      # LCU API integration
└── package.json         # Dependencies & scripts
```

### Available Scripts

```bash
npm run dev              # Start Vite dev server (web)
npm run build            # Build for production
npm run electron:dev     # Run Electron in development
npm run electron:build   # Build Electron app
npm run preview          # Preview production build
```

## 📦 Building

### Build for Production

```bash
# Install dependencies
npm install

# Build the Electron app
npm run electron:build
```

Output files will be in `dist/` directory:
- Windows: `.exe` installer
- macOS: `.dmg` disk image
- Linux: `.AppImage`

### Build Configuration

Edit `package.json` to customize build settings:

```json
{
  "build": {
    "appId": "com.lolaccountmanager.app",
    "productName": "LoL Account Manager",
    "win": {
      "icon": "resources/favicon.ico"
    }
  }
}
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## ⚠️ Disclaimer

**Important Notes:**

1. **Auto-Login Feature**: The automated login feature uses input simulation, which may violate Riot Games' Terms of Service. Use at your own risk. The developer is not responsible for any account actions taken by Riot Games.

2. **Third-Party Application**: This is an unofficial, community-made tool not endorsed by Riot Games. "League of Legends" and "Riot Games" are trademarks or registered trademarks of Riot Games, Inc.

3. **No Warranty**: This software is provided "as is" without warranty of any kind.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Riot Games](https://www.riotgames.com/) for the API
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Electron](https://www.electronjs.org/) for desktop framework
- All contributors and users of this project

---

**Made with ❤️ by the League of Legends community**

**Support**: For issues or questions, please open an issue on [GitHub](https://github.com/yourusername/lol-account-manager/issues)