const { spawn, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const { keyboard, Key, sleep, screen, imageResource } = require("@nut-tree-fork/nut-js");
const { windowManager } = require("node-window-manager");

keyboard.config.autoDelayMs = 60;

const PROCESS_NAMES = [
  "LeagueClient.exe",
  "LeagueClientUx.exe",
  "LeagueClientUxRender.exe",
  "LeagueClientOptimus.exe",
  "RiotClientServices.exe",
  "RiotClientCrashHandler.exe",
];

const LOCKFILE_NAME = "lockfile";
const LOCAL_RESOURCES_DIR = path.join(__dirname, "resources");
const DEFAULT_RESOURCES_DIR = fs.existsSync(LOCAL_RESOURCES_DIR)
  ? LOCAL_RESOURCES_DIR
  : path.join(process.resourcesPath || __dirname, "resources");
const FOCUS_TEMPLATE = "riot-login-username.png";
const WINDOW_POLL_TIMEOUT_MS = 90_000;
const WINDOW_POLL_INTERVAL_MS = 1_000;
const POST_FOCUS_SLEEP_MS = 2000;
const FOCUS_DETECTION_TIMEOUT_MS = 6000;

if (fs.existsSync(DEFAULT_RESOURCES_DIR)) {
  screen.config.resourceDirectory = DEFAULT_RESOURCES_DIR;
} else {
  console.warn("[LoginManager] Aucun dossier resources détecté, désactivation de la validation visuelle.");
}

class LoginManager {
  constructor(sendStatus) {
    this.sendStatus = sendStatus;
    this.currentAccountId = null;
  }

  async login({ accountId, login, password, leaguePath }) {
    console.log("[LoginManager]", "Trigger login", { accountId, leaguePath });
    if (!accountId) {
      throw new Error("Identifiant de compte manquant.");
    }
    if (!login || !password) {
      throw new Error("Identifiants Riot manquants pour ce compte.");
    }
    if (!leaguePath) {
      throw new Error(
        "Chemin League of Legends non configuré. Merci de l'indiquer avant de lancer une connexion."
      );
    }
    if (this.currentAccountId && this.currentAccountId !== accountId) {
      throw new Error(
        "Une autre connexion est déjà en cours. Merci d'attendre la fin de l'opération."
      );
    }

    this.currentAccountId = accountId;

    try {
      const riotClientPath = this.normalizePath(leaguePath);
      const lockfilePath = this.resolveLockfilePath(riotClientPath);

      this.emit(accountId, "close-clients", "Fermeture des clients Riot/League existants…");
      console.log("[LoginManager]", "Killing existing Riot processes");
      await this.closeExistingClients();
      await this.removeFileIfExists(lockfilePath);

      console.log("[LoginManager]", "Cleaned lockfile");
      this.emit(accountId, "launch-client", "Lancement du Riot Client…");
      console.log("[LoginManager]", "Launching Riot client");
      await this.launchRiotClient(riotClientPath);

      this.emit(accountId, "wait-login-window", "Recherche de la fenêtre Riot Client…");
      const riotWindow = await this.waitForLoginWindow();
      console.log("[LoginManager]", "Window detected", riotWindow?.getTitle?.());

      this.emit(accountId, "focus-window", "Mise au premier plan du Riot Client…");
      await this.bringWindowToFront(riotWindow);
      console.log("[LoginManager]", "Window focused");

      await this.ensureVisualFocus();
      console.log("[LoginManager]", "Visual focus ensured");

      this.emit(accountId, "type-credentials", "Saisie des identifiants…");
      await this.typeCredentials(login, password);
      console.log("[LoginManager]", "Credentials typed");

      this.emit(accountId, "confirm-login", "Validation de la connexion…");
      await this.launchLogin();
      console.log("[LoginManager]", "Login confirmed via Enter");

      this.emit(
        accountId,
        "completed",
        "Identifiants envoyés. Vérifie le client pour confirmer la connexion.",
        "success"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'automatisation de la connexion.";
      this.emit(accountId, "error", message, "error");
      throw error;
    } finally {
      this.currentAccountId = null;
    }
  }

  emit(accountId, step, message, kind = "info") {
    this.sendStatus({
      accountId,
      step,
      message,
      kind,
    });
  }

  normalizePath(inputPath) {
    return inputPath.replace(/"/g, "").trim();
  }

  async closeExistingClients() {
    console.log("[LoginManager]", "Closing known Riot processes", PROCESS_NAMES);
    const executions = PROCESS_NAMES.map(
      (name) =>
        new Promise((resolve) => {
          const killer = execFile(
            "taskkill",
            ["/IM", name, "/F", "/T"],
            { windowsHide: true },
            () => resolve()
          );
          killer.on("error", () => resolve());
        })
    );

    await Promise.all(executions);
  }

  async launchRiotClient(executablePath) {
    console.log("[LoginManager]", "Spawning Riot client at", executablePath);
    await fs.promises.access(executablePath, fs.constants.X_OK | fs.constants.F_OK);

    await new Promise((resolve, reject) => {
      const child = spawn(
        executablePath,
        ["--launch-product=league_of_legends", "--launch-patchline=live"],
        {
          detached: true,
          windowsHide: true,
          stdio: "ignore",
        }
      );

      child.on("error", reject);

      setTimeout(() => {
        try {
          child.unref();
        } catch (error) {
          // ignore
        }
        resolve();
      }, 2000);
    });
    console.log("[LoginManager]", "Riot client launch command issued");
  }

  resolveLockfilePath(riotClientPath) {
    const riotDir = path.dirname(riotClientPath);
    const leagueDir = path.resolve(riotDir, "..", "League of Legends");
    return path.join(leagueDir, LOCKFILE_NAME);
  }

  async ensureVisualFocus() {
    const templatePath = path.join(DEFAULT_RESOURCES_DIR, FOCUS_TEMPLATE);
    if (!(await this.fileExists(templatePath)) || !screen.imageFinder) {
      if (!screen.imageFinder) {
        console.warn("[LoginManager]", "Aucun imageFinder configuré, saut du contrôle visuel.");
      }
      await sleep(POST_FOCUS_SLEEP_MS);
      return;
    }

    try {
      console.log("[LoginManager]", "Waiting for visual template", FOCUS_TEMPLATE);
      await screen.waitFor(imageResource(FOCUS_TEMPLATE), FOCUS_DETECTION_TIMEOUT_MS);
    } catch (error) {
      console.warn(
        "Impossible de confirmer visuellement le focus sur le champ login:",
        error?.message ?? error
      );
    } finally {
      await sleep(POST_FOCUS_SLEEP_MS);
    }
  }

  async waitForLoginWindow() {
    const start = Date.now();
    while (Date.now() - start < WINDOW_POLL_TIMEOUT_MS) {
      const win = this.findLoginWindow();
      if (win) {
        console.log("[LoginManager]", "Found candidate window", win.getTitle?.());
        return win;
      }
      await sleep(WINDOW_POLL_INTERVAL_MS);
    }
    throw new Error(
      "Impossible de détecter la fenêtre de connexion Riot. Vérifie que le client s'est bien lancé."
    );
  }

  findLoginWindow() {
    const windows = windowManager.getWindows();
    return windows.find((win) => {
      try {
        const title = (win.getTitle() || "").toLowerCase();
        const module = (win.path || "").toLowerCase();
        return (
          title.includes("riot client") ||
          title.includes("league of legends") ||
          title.includes("connexion") ||
          title.includes("login") ||
          module.endsWith("riot client.exe")
        );
      } catch (error) {
        return false;
      }
    });
  }

  async bringWindowToFront(win) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        win.bringToTop();
        if (typeof win.setForeground === "function") {
          win.setForeground();
        }
        if (typeof win.focus === "function") {
          win.focus();
        }
        console.log("[LoginManager]", "Foreground request sent", { attempt });
      } catch (error) {
        console.warn("Impossible de focus la fenetre Riot:", error);
      }

      await sleep(POST_FOCUS_SLEEP_MS);
      if (this.isRiotForeground(win)) {
        console.log("[LoginManager]", "Riot window confirmed in foreground");
        return;
      }
    }

    console.warn("[LoginManager]", "Impossible de confirmer le focus automatique, poursuite du script.");
  }

  async typeCredentials(username, password) {
    await this.replaceCurrentField(username);
    await this.pressTabs(1);
    await this.replaceCurrentField(password);
  }

  async replaceCurrentField(text) {
    await keyboard.pressKey(Key.LeftControl, Key.A);
    await keyboard.releaseKey(Key.LeftControl, Key.A);
    await keyboard.pressKey(Key.Delete);
    await keyboard.releaseKey(Key.Delete);
    await sleep(150);
    await keyboard.type(text);
    await sleep(200);
  }

  async pressTabs(count) {
    for (let i = 0; i < count; i++) {
      await keyboard.pressKey(Key.Tab);
      await keyboard.releaseKey(Key.Tab);
      await sleep(120);
    }
  }

  async launchLogin() {
    await keyboard.pressKey(Key.Enter);
    await keyboard.releaseKey(Key.Enter);
    await sleep(500);
  }

  async removeFileIfExists(filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        console.warn("Impossible de nettoyer le lockfile:", filePath, error?.message);
      }
    }
  }

  isRiotForeground(targetWindow) {
    try {
      const active = windowManager.getActiveWindow();
      if (!active) {
        return false;
      }
      const activeTitle = (active.getTitle() || "").toLowerCase();
      if (targetWindow) {
        const targetTitle = (targetWindow.getTitle() || "").toLowerCase();
        if (activeTitle === targetTitle) {
          return true;
        }
      }
      return (
        activeTitle.includes("riot client") ||
        activeTitle.includes("league of legends") ||
        activeTitle.includes("connexion")
      );
    } catch (error) {
      console.warn("[LoginManager]", "Impossible de déterminer la fenêtre active:", error);
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = {
  LoginManager,
};


