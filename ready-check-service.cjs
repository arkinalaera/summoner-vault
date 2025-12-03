const https = require("https");
const { exec } = require("child_process");

const LOCK_REFRESH_INTERVAL_MS = 5000;
const POLL_INTERVAL_MS = 4000;

class ReadyCheckService {
  constructor(sendStatus, sendDecayUpdate) {
    this.sendStatus = sendStatus;
    this.sendDecayUpdate = sendDecayUpdate;
    this.leaguePath = "";
    this.lockInfo = null;
    this.lockfilePath = null;
    this.interval = null;
    this.accountCheckInterval = null;
    this.agent = new https.Agent({ rejectUnauthorized: false });
    this.lastErrorLoggedAt = 0;
    this.autoAcceptEnabled = false;
    this.lastConnectedPuuid = null; // Track connected account
  }

  setLeaguePath(nextPath) {
    this.leaguePath = nextPath || "";
    this.lockInfo = null;
    this.lockfilePath = null;
  }

  setAutoAcceptEnabled(enabled) {
    this.autoAcceptEnabled = !!enabled;
  }

  getAutoAcceptEnabled() {
    return this.autoAcceptEnabled;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.tick().catch((error) => {
        this.logError("tick failure", error);
      });
    }, POLL_INTERVAL_MS);

    // Start account detection interval (checks every 10 seconds)
    if (!this.accountCheckInterval) {
      this.accountCheckInterval = setInterval(() => {
        this.checkConnectedAccount().catch(() => {
          // Silent fail - don't spam logs
        });
      }, 10000);
      // Also check immediately on start
      this.checkConnectedAccount().catch(() => {});
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.accountCheckInterval) {
      clearInterval(this.accountCheckInterval);
      this.accountCheckInterval = null;
    }
  }

  async tick() {
    if (!this.leaguePath || !this.autoAcceptEnabled) {
      return;
    }

    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      return;
    }

    try {
      const readyState = await this.requestLcU(lockInfo, {
        method: "GET",
        path: "/lol-matchmaking/v1/ready-check",
      });

      if (!readyState) {
        console.log("[ReadyCheckService]", "Ready-check empty response");
        return;
      }
      console.log("[ReadyCheckService]", "Ready-check payload", readyState);

      const normalizedState = String(readyState.state || "")
        .trim()
        .toLowerCase();
      console.log("[ReadyCheckService]", "Ready-check state", normalizedState);
      if (normalizedState !== "inprogress") {
        return;
      }

      const localResponse = this.normalizeResponse(
        readyState.playerResponse ||
          readyState.localPlayer?.response ||
          readyState.localPlayer?.playerResponse
      );
      console.log("[ReadyCheckService]", "Local ready response", localResponse);

      if (localResponse === "accepted") {
        return;
      }

      await this.requestLcU(lockInfo, {
        method: "POST",
        path: "/lol-matchmaking/v1/ready-check/accept",
      });

      this.sendStatus({
        step: "ready-check",
        kind: "success",
        message: "Match accepté automatiquement.",
        timestamp: Date.now(),
      });
    } catch (error) {
      if (error && error.statusCode === 401) {
        this.lockInfo = null;
      }
      if (error && error.body) {
        console.warn("[ReadyCheckService]", "LCU error body", error.body);
      }
      this.logError("ready-check polling failed", error);
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
      console.log(
        "[ReadyCheckService]",
        "LCU request",
        {
          path: options.path,
          method: options.method,
          port: lockInfo.port,
          password: lockInfo.password,
        },
        headers.Authorization
      );
      const req = https.request(requestOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log("[ReadyCheckService]", "LCU response", {
            status: res.statusCode,
            path: options.path,
            method: options.method,
            body: data,
          });
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

  normalizeResponse(value) {
    if (!value) return "";
    return String(value).trim().toLowerCase();
  }

  async setAvailability(status) {
    // status: "chat", "away", "offline", "mobile", "dnd"
    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      throw new Error("League client not connected");
    }

    try {
      // Send body with availability set
      await this.requestLcU(lockInfo, {
        method: "PUT",
        path: "/lol-chat/v1/me",
        body: {
          summonerId: 0,
          id: "",
          name: "",
          pid: "",
          puuid: "",
          obfuscatedSummonerId: 0,
          gameName: "",
          gameTag: "",
          icon: 0,
          availability: status,
          platformId: "",
          patchline: "",
          product: "",
          productName: "",
          summary: "",
          time: 0,
          statusMessage: "",
          lastSeenOnlineTimestamp: "",
          lol: {}
        },
      });

      console.log("[ReadyCheckService]", `Availability set to: ${status}`);
      return { success: true, availability: status };
    } catch (error) {
      console.error("[ReadyCheckService]", "Failed to set availability:", error);
      if (error && error.statusCode === 401) {
        this.lockInfo = null;
      }
      throw error;
    }
  }

  logError(context, error) {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt > 5000) {
      console.warn("[ReadyCheckService]", context, error?.message ?? error);
      this.lastErrorLoggedAt = now;
    }
  }

  // Check if a new account has connected and send decay info
  async checkConnectedAccount() {
    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      // Client not running, reset tracking
      if (this.lastConnectedPuuid !== null) {
        console.log("[ReadyCheckService]", "Client disconnected, resetting account tracking");
        this.lastConnectedPuuid = null;
      }
      return;
    }

    try {
      // Get current summoner
      const summoner = await this.requestLcU(lockInfo, {
        method: "GET",
        path: "/lol-summoner/v1/current-summoner",
      });

      if (!summoner?.puuid) {
        return;
      }

      // Check if this is a new account (different from last one)
      if (this.lastConnectedPuuid === summoner.puuid) {
        return; // Same account, no update needed
      }

      console.log("[ReadyCheckService]", "New account detected:", summoner.gameName || summoner.displayName);
      this.lastConnectedPuuid = summoner.puuid;

      // Get decay info for this account
      const rankedStats = await this.requestLcU(lockInfo, {
        method: "GET",
        path: "/lol-ranked/v1/current-ranked-stats",
      });

      const soloQueue = rankedStats?.queueMap?.RANKED_SOLO_5x5;
      const flexQueue = rankedStats?.queueMap?.RANKED_FLEX_SR;

      const decayInfo = {
        gameName: summoner?.gameName || summoner?.displayName || "",
        tagLine: summoner?.tagLine || "",
        summonerName: summoner?.displayName || "",
        puuid: summoner?.puuid || "",
        soloDecayDays: soloQueue?.warnings?.daysUntilDecay ?? -1,
        flexDecayDays: flexQueue?.warnings?.daysUntilDecay ?? -1,
        timestamp: new Date().toISOString(),
      };

      console.log("[ReadyCheckService]", "Sending decay update:", decayInfo);

      // Send to frontend
      if (this.sendDecayUpdate) {
        this.sendDecayUpdate(decayInfo);
      }
    } catch (error) {
      // Silent fail - client might be in transition state
      if (error && error.statusCode === 401) {
        this.lockInfo = null;
      }
    }
  }

  // Test function to explore ranked stats and decay info
  async getRankedStats() {
    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      throw new Error("League client not connected");
    }

    try {
      // Try multiple endpoints to find decay info
      const endpoints = [
        "/lol-ranked/v1/current-ranked-stats",
        "/lol-ranked/v1/ranked-stats",
        "/lol-ranked/v1/eos-rewards",
        "/lol-ranked/v1/splits-config",
        "/lol-ranked/v2/tiers",
      ];

      const results = {};

      for (const endpoint of endpoints) {
        try {
          const data = await this.requestLcU(lockInfo, {
            method: "GET",
            path: endpoint,
          });
          results[endpoint] = data;
          console.log("[ReadyCheckService]", `${endpoint}:`, JSON.stringify(data, null, 2));
        } catch (err) {
          results[endpoint] = { error: err.message };
          console.log("[ReadyCheckService]", `${endpoint} failed:`, err.message);
        }
      }

      return results;
    } catch (error) {
      console.error("[ReadyCheckService]", "Failed to get ranked stats:", error);
      throw error;
    }
  }

  // Get decay info for the currently connected account
  async getDecayInfo() {
    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      throw new Error("League client not connected");
    }

    try {
      const data = await this.requestLcU(lockInfo, {
        method: "GET",
        path: "/lol-ranked/v1/current-ranked-stats",
      });

      const soloQueue = data?.queueMap?.RANKED_SOLO_5x5;
      const flexQueue = data?.queueMap?.RANKED_FLEX_SR;

      const result = {
        soloDecayDays: soloQueue?.warnings?.daysUntilDecay ?? -1,
        flexDecayDays: flexQueue?.warnings?.daysUntilDecay ?? -1,
        timestamp: new Date().toISOString(),
      };

      console.log("[ReadyCheckService]", "Decay info:", result);
      return result;
    } catch (error) {
      console.error("[ReadyCheckService]", "Failed to get decay info:", error);
      throw error;
    }
  }

  // Get current summoner info (to identify which account is connected)
  async getCurrentSummoner() {
    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      throw new Error("League client not connected");
    }

    try {
      // Get current summoner info
      const summoner = await this.requestLcU(lockInfo, {
        method: "GET",
        path: "/lol-summoner/v1/current-summoner",
      });

      console.log("[ReadyCheckService]", "Current summoner:", summoner);

      return {
        gameName: summoner?.gameName || summoner?.displayName || "",
        tagLine: summoner?.tagLine || "",
        summonerName: summoner?.displayName || "",
        puuid: summoner?.puuid || "",
        summonerId: summoner?.summonerId || 0,
        accountId: summoner?.accountId || 0,
      };
    } catch (error) {
      console.error("[ReadyCheckService]", "Failed to get current summoner:", error);
      throw error;
    }
  }

  // Get decay info with summoner identification
  async getDecayInfoWithSummoner() {
    const lockInfo = await this.ensureLockInfo();
    if (!lockInfo) {
      throw new Error("League client not connected");
    }

    try {
      // Get both summoner info and decay info in parallel
      const [summoner, rankedStats] = await Promise.all([
        this.requestLcU(lockInfo, {
          method: "GET",
          path: "/lol-summoner/v1/current-summoner",
        }),
        this.requestLcU(lockInfo, {
          method: "GET",
          path: "/lol-ranked/v1/current-ranked-stats",
        }),
      ]);

      const soloQueue = rankedStats?.queueMap?.RANKED_SOLO_5x5;
      const flexQueue = rankedStats?.queueMap?.RANKED_FLEX_SR;

      const result = {
        // Summoner identification
        gameName: summoner?.gameName || summoner?.displayName || "",
        tagLine: summoner?.tagLine || "",
        summonerName: summoner?.displayName || "",
        puuid: summoner?.puuid || "",
        // Decay info
        soloDecayDays: soloQueue?.warnings?.daysUntilDecay ?? -1,
        flexDecayDays: flexQueue?.warnings?.daysUntilDecay ?? -1,
        timestamp: new Date().toISOString(),
      };

      console.log("[ReadyCheckService]", "Decay info with summoner:", result);
      return result;
    } catch (error) {
      console.error("[ReadyCheckService]", "Failed to get decay info with summoner:", error);
      throw error;
    }
  }
}

module.exports = {
  ReadyCheckService,
};
