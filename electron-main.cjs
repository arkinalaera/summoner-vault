// electron-main.cjs
const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");
const handler = require("serve-handler");

let mainWindow;
let server;

const isDev = !app.isPackaged; // true en dev, false dans le .exe

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#050816",
    title: "LoL Account Manager",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (server) {
    server.close();
  }
});
