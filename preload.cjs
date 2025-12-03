const { contextBridge, ipcRenderer } = require("electron");

const API_CHANNELS = {
  selectLeaguePath: "lol:path:select",
  getLeaguePath: "lol:path:get",
  setLeaguePath: "lol:path:set",
  loginAccount: "lol:account:login",
  loginStatus: "lol:login-status",
  readyStatus: "lol:ready-status",
  championSelectStatus: "lol:champion-select-status",
  autoAcceptGet: "lol:auto-accept:get",
  autoAcceptSet: "lol:auto-accept:set",
  championSelectSetSettings: "lol:champion-select:set-settings",
  championSelectGetSettings: "lol:champion-select:get-settings",
  riotApiKeyGet: "riot:apikey:get",
  riotApiKeySet: "riot:apikey:set",
  encryptAccount: "encrypt:account",
  decryptAccount: "decrypt:account",
  appQuit: "app:quit",
  setAvailability: "lol:set-availability",
  rankedStatsGet: "lol:ranked-stats:get",
  decayInfoGet: "lol:decay-info:get",
  decayInfoWithSummonerGet: "lol:decay-info-with-summoner:get",
  decayUpdate: "lol:decay-update",
};

contextBridge.exposeInMainWorld("api", {
  selectLeaguePath() {
    return ipcRenderer.invoke(API_CHANNELS.selectLeaguePath);
  },
  getLeaguePath() {
    return ipcRenderer.invoke(API_CHANNELS.getLeaguePath);
  },
  setLeaguePath(nextPath) {
    return ipcRenderer.invoke(API_CHANNELS.setLeaguePath, nextPath);
  },
  loginAccount(payload) {
    return ipcRenderer.invoke(API_CHANNELS.loginAccount, payload);
  },
  getAutoAcceptEnabled() {
    return ipcRenderer.invoke(API_CHANNELS.autoAcceptGet);
  },
  setAutoAcceptEnabled(nextValue) {
    return ipcRenderer.invoke(API_CHANNELS.autoAcceptSet, nextValue);
  },
  getRiotApiKey() {
    return ipcRenderer.invoke(API_CHANNELS.riotApiKeyGet);
  },
  setRiotApiKey(nextKey) {
    return ipcRenderer.invoke(API_CHANNELS.riotApiKeySet, nextKey);
  },
  encryptAccount(account) {
    return ipcRenderer.invoke(API_CHANNELS.encryptAccount, account);
  },
  decryptAccount(encryptedAccount) {
    return ipcRenderer.invoke(API_CHANNELS.decryptAccount, encryptedAccount);
  },
  quitApp() {
    return ipcRenderer.invoke(API_CHANNELS.appQuit);
  },
  setAvailability(status) {
    return ipcRenderer.invoke(API_CHANNELS.setAvailability, status);
  },
  onLoginStatus(callback) {
    if (typeof callback !== "function") {
      return undefined;
    }

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on(API_CHANNELS.loginStatus, listener);

    return () => {
      ipcRenderer.removeListener(API_CHANNELS.loginStatus, listener);
    };
  },
  onReadyStatus(callback) {
    if (typeof callback !== "function") {
      return undefined;
    }

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on(API_CHANNELS.readyStatus, listener);

    return () => {
      ipcRenderer.removeListener(API_CHANNELS.readyStatus, listener);
    };
  },
  onChampionSelectStatus(callback) {
    if (typeof callback !== "function") {
      return undefined;
    }

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on(API_CHANNELS.championSelectStatus, listener);

    return () => {
      ipcRenderer.removeListener(API_CHANNELS.championSelectStatus, listener);
    };
  },
  setChampionSelectSettings(settings) {
    return ipcRenderer.invoke(API_CHANNELS.championSelectSetSettings, settings);
  },
  getChampionSelectSettings() {
    return ipcRenderer.invoke(API_CHANNELS.championSelectGetSettings);
  },
  getRankedStats() {
    return ipcRenderer.invoke(API_CHANNELS.rankedStatsGet);
  },
  getDecayInfo() {
    return ipcRenderer.invoke(API_CHANNELS.decayInfoGet);
  },
  getDecayInfoWithSummoner() {
    return ipcRenderer.invoke(API_CHANNELS.decayInfoWithSummonerGet);
  },
  onDecayUpdate(callback) {
    if (typeof callback !== "function") {
      return undefined;
    }

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on(API_CHANNELS.decayUpdate, listener);

    return () => {
      ipcRenderer.removeListener(API_CHANNELS.decayUpdate, listener);
    };
  },
});
