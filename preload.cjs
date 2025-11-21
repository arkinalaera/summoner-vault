const { contextBridge, ipcRenderer } = require("electron");

const API_CHANNELS = {
  selectLeaguePath: "lol:path:select",
  getLeaguePath: "lol:path:get",
  setLeaguePath: "lol:path:set",
  readyStatus: "lol:ready-status",
  autoAcceptGet: "lol:auto-accept:get",
  autoAcceptSet: "lol:auto-accept:set",
  riotApiKeyGet: "riot:apikey:get",
  riotApiKeySet: "riot:apikey:set",
  encryptAccount: "encrypt:account",
  decryptAccount: "decrypt:account",
  appQuit: "app:quit",
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
});
