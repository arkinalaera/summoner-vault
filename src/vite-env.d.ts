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

  interface ChampionSelectStatusPayload {
    step: string;
    kind?: "info" | "success" | "error";
    message?: string;
    timestamp?: number;
  }

  interface DecayUpdatePayload {
    gameName: string;
    tagLine: string;
    summonerName: string;
    puuid: string;
    soloDecayDays: number;
    flexDecayDays: number;
    timestamp: string;
  }

  interface ChampionSelectSettings {
    accountId?: string;
    enabled: boolean;
    pickChampionId: number | null;
    banChampionId: number | null;
  }

  interface LeagueDesktopApi {
    selectLeaguePath: () => Promise<string | null>;
    getLeaguePath: () => Promise<string | null>;
    setLeaguePath: (next: string) => Promise<void>;
    loginAccount: (payload: LoginAccountPayload) => Promise<void>;
    getAutoAcceptEnabled: () => Promise<boolean>;
    setAutoAcceptEnabled: (next: boolean) => Promise<boolean>;
    getRiotApiKey: () => Promise<string | null>;
    setRiotApiKey: (next: string) => Promise<string | null>;
    encryptAccount: (account: any) => Promise<any>;
    decryptAccount: (encryptedAccount: any) => Promise<any>;
    quitApp: () => Promise<void>;
    onLoginStatus: (
      callback: (payload: LoginStatusPayload) => void
    ) => (() => void) | void;
    onReadyStatus: (
      callback: (payload: ReadyStatusPayload) => void
    ) => (() => void) | void;
    onChampionSelectStatus: (
      callback: (payload: ChampionSelectStatusPayload) => void
    ) => (() => void) | void;
    setChampionSelectSettings: (settings: ChampionSelectSettings) => Promise<{ success: boolean }>;
    getChampionSelectSettings: () => Promise<ChampionSelectSettings>;
    setAvailability: (status: string) => Promise<any>;
    getRankedStats: () => Promise<any>;
    getDecayInfo: () => Promise<{ soloDecayDays: number; flexDecayDays: number; timestamp: string }>;
    getDecayInfoWithSummoner: () => Promise<DecayUpdatePayload>;
    onDecayUpdate: (
      callback: (payload: DecayUpdatePayload) => void
    ) => (() => void) | void;
  }

  interface Window {
    api?: LeagueDesktopApi;
  }
}

export {};
