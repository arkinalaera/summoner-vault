const { contextBridge, ipcRenderer } = require("electron");

const API_CHANNELS = {
  selectLeaguePath: "lol:path:select",
  getLeaguePath: "lol:path:get",
  setLeaguePath: "lol:path:set",
  loginAccount: "lol:account:login",
  loginStatus: "lol:login-status",
  readyStatus: "lol:ready-status",
  autoAcceptGet: "lol:auto-accept:get",
  autoAcceptSet: "lol:auto-accept:set",
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
  loginAccount(payload) {
    return ipcRenderer.invoke(API_CHANNELS.loginAccount, payload);
  },
  getAutoAcceptEnabled() {
    return ipcRenderer.invoke(API_CHANNELS.autoAcceptGet);
  },
  setAutoAcceptEnabled(nextValue) {
    return ipcRenderer.invoke(API_CHANNELS.autoAcceptSet, nextValue);
  },
  quitApp() {
    return ipcRenderer.invoke(API_CHANNELS.appQuit);
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
});
