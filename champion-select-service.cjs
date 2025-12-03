const https = require("https");
const { exec } = require("child_process");

const LOCK_REFRESH_INTERVAL_MS = 5000;
const POLL_INTERVAL_MS = 1000; // Check more frequently for champion select

class ChampionSelectService {
  constructor(sendStatus) {
    this.sendStatus = sendStatus;
    this.leaguePath = "";
    this.lockInfo = null;
    this.interval = null;
    this.agent = new https.Agent({ rejectUnauthorized: false });
    this.lastErrorLoggedAt = 0;

    // Auto-pick/ban settings per account
    this.autoPickBanEnabled = false;
    this.championToPick = null; // Champion ID to pick
    this.championToBan = null; // Champion ID to ban

    // Track what we've already done in this session
    this.currentSessionId = null;
    this.hasBanned = false;
    this.hasPrePicked = false;
    this.hasPicked = false;
  }

  setLeaguePath(nextPath) {
    this.leaguePath = nextPath || "";
    this.lockInfo = null;
  }

  setAutoPickBanSettings({ enabled, pickChampionId, banChampionId }) {
    this.autoPickBanEnabled = !!enabled;
    this.championToPick = pickChampionId || null;
    this.championToBan = banChampionId || null;
    console.log("[ChampionSelectService]", "Settings updated:", {
      enabled: this.autoPickBanEnabled,
      pick: this.championToPick,
      ban: this.championToBan,
    });
  }

  getAutoPickBanSettings() {
    return {
      enabled: this.autoPickBanEnabled,
      pickChampionId: this.championToPick,
      banChampionId: this.championToBan,
    };
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.tick().catch((error) => {
        this.logError("tick failure", error);
      });
    }, POLL_INTERVAL_MS);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async tick() {
    if (!this.leaguePath || !this.autoPickBanEnabled) {
      return;
    }

    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      return;
    }

    try {
      const session = await this.requestLcU(lockInfo, {
        method: "GET",
        path: "/lol-champ-select/v1/session",
      });

      if (!session) {
        // Not in champion select, reset state
        this.resetSessionState();
        return;
      }

      // New session detected
      if (session.timer?.adjustedTimeLeftInPhase && this.currentSessionId !== session.timer.internalNowInEpochMs) {
        const sessionChanged = this.currentSessionId !== session.timer.internalNowInEpochMs;
        this.currentSessionId = session.timer.internalNowInEpochMs;

        if (sessionChanged) {
          console.log("[ChampionSelectService]", "New champion select session detected");
          this.hasBanned = false;
          this.hasPrePicked = false;
          this.hasPicked = false;
        }
      }

      // Find local player's cell
      const localPlayerCellId = session.localPlayerCellId;
      const myTeam = session.myTeam || [];
      const localCell = myTeam.find((cell) => cell.cellId === localPlayerCellId);

      if (!localCell) {
        console.log("[ChampionSelectService]", "Local player cell not found");
        return;
      }

      // Get current phase
      const currentPhase = session.timer?.phase;
      console.log("[ChampionSelectService]", "Current phase:", currentPhase, "Cell:", localCell);

      // Handle BAN phase
      if (currentPhase === "BAN_PICK" && this.championToBan && !this.hasBanned) {
        // Check if it's our turn to ban
        const actions = session.actions || [];
        for (const actionGroup of actions) {
          for (const action of actionGroup) {
            if (
              action.actorCellId === localPlayerCellId &&
              action.type === "ban" &&
              !action.completed &&
              action.isInProgress
            ) {
              await this.performBan(lockInfo, action.id, this.championToBan);
              this.hasBanned = true;
              break;
            }
          }
        }
      }

      // Handle PICK phase - Pre-pick first
      if (currentPhase === "PLANNING" || currentPhase === "BAN_PICK") {
        if (this.championToPick && !this.hasPrePicked) {
          await this.performPrePick(lockInfo, localPlayerCellId, this.championToPick);
          this.hasPrePicked = true;
        }
      }

      // Handle PICK phase - Actual pick
      if (currentPhase === "BAN_PICK" && this.championToPick && !this.hasPicked) {
        // Check if it's our turn to pick
        const actions = session.actions || [];
        for (const actionGroup of actions) {
          for (const action of actionGroup) {
            if (
              action.actorCellId === localPlayerCellId &&
              action.type === "pick" &&
              !action.completed &&
              action.isInProgress
            ) {
              await this.performPick(lockInfo, action.id, this.championToPick);
              this.hasPicked = true;
              break;
            }
          }
        }
      }
    } catch (error) {
      if (error && error.statusCode === 401) {
        this.lockInfo = null;
      }
      if (error && error.statusCode === 404) {
        // Not in champion select
        this.resetSessionState();
        return;
      }
      if (error && error.body) {
        console.warn("[ChampionSelectService]", "LCU error body", error.body);
      }
      this.logError("champion-select polling failed", error);
    }
  }

  async performBan(lockInfo, actionId, championId) {
    try {
      await this.requestLcU(lockInfo, {
        method: "PATCH",
        path: `/lol-champ-select/v1/session/actions/${actionId}`,
        body: {
          championId: championId,
        },
      });

      // Complete the ban
      await this.requestLcU(lockInfo, {
        method: "POST",
        path: `/lol-champ-select/v1/session/actions/${actionId}/complete`,
      });

      console.log("[ChampionSelectService]", `Champion ${championId} banned automatically`);
      this.sendStatus({
        step: "champion-select",
        kind: "success",
        message: `Champion banni automatiquement.`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[ChampionSelectService]", "Failed to ban champion:", error);
      this.sendStatus({
        step: "champion-select",
        kind: "error",
        message: `Échec du ban automatique.`,
        timestamp: Date.now(),
      });
    }
  }

  async performPrePick(lockInfo, cellId, championId) {
    try {
      await this.requestLcU(lockInfo, {
        method: "PATCH",
        path: `/lol-champ-select/v1/session/my-selection`,
        body: {
          championId: championId,
        },
      });

      console.log("[ChampionSelectService]", `Champion ${championId} pre-picked`);
    } catch (error) {
      console.error("[ChampionSelectService]", "Failed to pre-pick champion:", error);
    }
  }

  async performPick(lockInfo, actionId, championId) {
    try {
      await this.requestLcU(lockInfo, {
        method: "PATCH",
        path: `/lol-champ-select/v1/session/actions/${actionId}`,
        body: {
          championId: championId,
        },
      });

      // Complete the pick
      await this.requestLcU(lockInfo, {
        method: "POST",
        path: `/lol-champ-select/v1/session/actions/${actionId}/complete`,
      });

      console.log("[ChampionSelectService]", `Champion ${championId} picked automatically`);
      this.sendStatus({
        step: "champion-select",
        kind: "success",
        message: `Champion pick automatiquement.`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("[ChampionSelectService]", "Failed to pick champion:", error);
      this.sendStatus({
        step: "champion-select",
        kind: "error",
        message: `Échec du pick automatique.`,
        timestamp: Date.now(),
      });
    }
  }

  resetSessionState() {
    if (this.currentSessionId !== null) {
      console.log("[ChampionSelectService]", "Exited champion select, resetting state");
      this.currentSessionId = null;
      this.hasBanned = false;
      this.hasPrePicked = false;
      this.hasPicked = false;
    }
  }

  async ensureLockInfo() {
    const now = Date.now();
    if (
      this.lockInfo &&
      now - this.lockInfo.loadedAt < LOCK_REFRESH_INTERVAL_MS
    ) {
      return this.lockInfo;
    }

    const fromProcess = await this.readLockInfoFromProcess();
    if (fromProcess) {
      this.lockInfo = fromProcess;
      return this.lockInfo;
    }

    this.lockInfo = null;
    return null;
  }

  async readLockInfoFromProcess() {
    return new Promise((resolve) => {
      exec(
        "wmic PROCESS WHERE name='LeagueClientUx.exe' GET commandline",
        { windowsHide: true },
        (error, stdout = "") => {
          if (error || !stdout) {
            return resolve(null);
          }

          const portMatch = stdout.match(/--app-port=(\d+)/);
          const tokenMatch = stdout.match(/--remoting-auth-token=([\w-]+)/);

          if (!portMatch || !tokenMatch) {
            return resolve(null);
          }

          const port = Number(portMatch[1]);
          const password = tokenMatch[1].replace(/["']/g, "");

          resolve({
            name: "process",
            pid: 0,
            port,
            password,
            protocol: "https",
            loadedAt: Date.now(),
          });
        }
      );
    });
  }

  async requestLcU(lockInfo, options) {
    const body = options.body ? JSON.stringify(options.body) : undefined;
    const headers = {
      Authorization: `Basic ${Buffer.from(`riot:${lockInfo.password}`).toString(
        "base64"
      )}`,
    };
    if (body) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    const requestOptions = {
      hostname: "127.0.0.1",
      port: lockInfo.port,
      path: options.path,
      method: options.method,
      agent: this.agent,
      headers,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            const err = new Error(
              `LCU request failed (${res.statusCode}) on ${options.method} ${options.path}`
            );
            err.statusCode = res.statusCode;
            try {
              const parsed = JSON.parse(data);
              err.body = parsed;
            } catch {
              err.body = data;
            }
            return reject(err);
          }
          if (!data) {
            return resolve(undefined);
          }
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            resolve(data);
          }
        });
      });

      req.on("error", reject);

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  logError(context, error) {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt > 5000) {
      console.warn("[ChampionSelectService]", context, error?.message ?? error);
      this.lastErrorLoggedAt = now;
    }
  }
}

module.exports = {
  ChampionSelectService,
};
