/// <reference types="vite/client" />

declare global {
  interface LoginStatusPayload {
    accountId: string;
    step: string;
    kind?: "info" | "success" | "error";
    message?: string;
  }

  interface LoginAccountPayload {
    accountId: string;
    login: string;
    password: string;
    region?: string;
  }

  interface ReadyStatusPayload {
    step: string;
    kind?: "info" | "success" | "error";
    message?: string;
    timestamp?: number;
  }

  interface LeagueDesktopApi {
    selectLeaguePath: () => Promise<string | null>;
    getLeaguePath: () => Promise<string | null>;
    setLeaguePath: (next: string) => Promise<void>;
    loginAccount: (payload: LoginAccountPayload) => Promise<void>;
    getAutoAcceptEnabled: () => Promise<boolean>;
    setAutoAcceptEnabled: (next: boolean) => Promise<boolean>;
    quitApp: () => Promise<void>;
    onLoginStatus: (
      callback: (payload: LoginStatusPayload) => void
    ) => (() => void) | void;
    onReadyStatus: (
      callback: (payload: ReadyStatusPayload) => void
    ) => (() => void) | void;
  }

  interface Window {
    api?: LeagueDesktopApi;
  }
}

export {};
