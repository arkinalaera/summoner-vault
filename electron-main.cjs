// electron-main.cjs
const { app, BrowserWindow, ipcMain, dialog, Menu, Tray } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const handler = require("serve-handler");
const { LoginManager } = require("./login-manager.cjs");
const { ReadyCheckService } = require("./ready-check-service.cjs");

let mainWindow;
let tray;
let server;
let settingsFilePath = "";
let settings = {
  leaguePath: "",
  autoAcceptEnabled: false,
};
let ipcRegistered = false;
let loginManager;
let readyCheckService;

const isDev = !app.isPackaged; // true en dev, false dans le .exe

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#050816",
    title: "LoL Account Manager",
    icon: path.join(__dirname, "resources", "favicon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // Supprimer complètement la barre de menu
  Menu.setApplicationMenu(null);

  if (isDev) {
    // DEV : Vite sur port 8080
    mainWindow.loadURL("http://localhost:8080");
  } else {
    // PROD : serveur HTTP fixe sur 127.0.0.1:17321
    const distPath = path.join(__dirname, "dist");
    const PROD_PORT = 17321;

    server = http.createServer((request, response) => {
      return handler(request, response, {
        public: distPath,
      });
    });

    server.listen(PROD_PORT, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${PROD_PORT}/`;
      console.log("Serving dist from", distPath, "at", url);
      mainWindow.loadURL(url);
      // mainWindow.webContents.openDevTools(); // si tu veux debug
    });
  }

  // Intercepter la fermeture pour minimiser dans le tray au lieu de quitter
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "resources", "favicon.ico");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Ouvrir",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      type: "separator",
    },
    {
      label: "Quitter",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("LoL Account Manager");
  tray.setContextMenu(contextMenu);

  // Double-clic sur l'icône pour afficher la fenêtre
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function loadSettings() {
  if (!settingsFilePath) return;
  try {
    const raw = await fs.promises.readFile(settingsFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    settings = {
      ...settings,
      ...parsed,
    };
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.error("Failed to read settings:", error);
    }
  }
}

async function saveSettings() {
  if (!settingsFilePath) return;
  try {
    await fs.promises.mkdir(path.dirname(settingsFilePath), { recursive: true });
    await fs.promises.writeFile(
      settingsFilePath,
      JSON.stringify(settings, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Failed to persist settings:", error);
  }
}

function sendLoginStatus(payload) {
  if (!mainWindow) return;
  mainWindow.webContents.send("lol:login-status", payload);
}

function sendReadyStatus(payload) {
  if (!mainWindow) return;
  mainWindow.webContents.send("lol:ready-status", payload);
}

function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;
  if (!loginManager) {
    loginManager = new LoginManager(sendLoginStatus);
  }
  if (!readyCheckService) {
    readyCheckService = new ReadyCheckService(sendReadyStatus);
    readyCheckService.setLeaguePath(settings.leaguePath);
    readyCheckService.setAutoAcceptEnabled(settings.autoAcceptEnabled);
    readyCheckService.start();
  }

  ipcMain.handle("lol:path:get", async () => {
    return settings.leaguePath || null;
  });

  ipcMain.handle("lol:path:set", async (_event, nextPath) => {
    settings.leaguePath = typeof nextPath === "string" ? nextPath : "";
    await saveSettings();
    if (readyCheckService) {
      readyCheckService.setLeaguePath(settings.leaguePath);
    }
    return settings.leaguePath || null;
  });

  ipcMain.handle("lol:path:select", async () => {
    const browser = BrowserWindow.getFocusedWindow() || mainWindow;
    const result = await dialog.showOpenDialog(browser, {
      title: "Sélectionner RiotClientServices.exe",
      properties: ["openFile"],
      filters: [
        {
          name: "Riot Client",
          extensions: ["exe"],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    settings.leaguePath = selectedPath;
    await saveSettings();
    if (readyCheckService) {
      readyCheckService.setLeaguePath(settings.leaguePath);
    }
    return selectedPath;
  });

  ipcMain.handle("lol:auto-accept:get", async () => {
    return !!settings.autoAcceptEnabled;
  });

  ipcMain.handle("lol:auto-accept:set", async (_event, enabled) => {
    settings.autoAcceptEnabled = !!enabled;
    await saveSettings();
    if (readyCheckService) {
      readyCheckService.setAutoAcceptEnabled(settings.autoAcceptEnabled);
    }
    return settings.autoAcceptEnabled;
  });

  ipcMain.handle("lol:account:login", async (_event, payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Informations de compte invalides.");
    }

    const { accountId, login, password, region } = payload;

    await loginManager.login({
      accountId,
      login,
      password,
      region,
      leaguePath: settings.leaguePath,
    });
  });

  ipcMain.handle("app:quit", async () => {
    app.isQuitting = true;
    app.quit();
  });
}

app.whenReady().then(async () => {
  settingsFilePath = path.join(app.getPath("userData"), "settings.json");
  await loadSettings();
  registerIpcHandlers();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (readyCheckService) {
    readyCheckService.stop();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (server) {
    server.close();
  }
  if (readyCheckService) {
    readyCheckService.stop();
  }
});

