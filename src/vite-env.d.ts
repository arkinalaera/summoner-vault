/// <reference types="vite/client" />

declare global {
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
    getAutoAcceptEnabled: () => Promise<boolean>;
    setAutoAcceptEnabled: (next: boolean) => Promise<boolean>;
    getRiotApiKey: () => Promise<string | null>;
    setRiotApiKey: (next: string) => Promise<string | null>;
    encryptAccount: (account: any) => Promise<any>;
    decryptAccount: (encryptedAccount: any) => Promise<any>;
    quitApp: () => Promise<void>;
    onReadyStatus: (
      callback: (payload: ReadyStatusPayload) => void
    ) => (() => void) | void;
  }

  interface Window {
    api?: LeagueDesktopApi;
  }
}

export {};
