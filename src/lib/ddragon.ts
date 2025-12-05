// Service pour fetcher dynamiquement les données depuis DDragon
// avec gestion de cache et fallback

import { CHAMPIONS as STATIC_CHAMPIONS, Champion } from "@/constants/champions";

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en ms
const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

interface CacheData<T> {
  data: T;
  timestamp: number;
}

interface DDragonState {
  version: string | null;
  champions: Champion[];
  championMap: Record<number, { name: string; id: string }>;
  initialized: boolean;
}

// State global
let state: DDragonState = {
  version: null,
  champions: STATIC_CHAMPIONS,
  championMap: {},
  initialized: false,
};

// Cache keys pour localStorage
const CACHE_KEYS = {
  VERSION: "ddragon_version",
  CHAMPIONS: "ddragon_champions",
  CHAMPION_MAP: "ddragon_champion_map",
};

function getFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed: CacheData<T> = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }

    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to cache DDragon data:", error);
  }
}

async function fetchLatestVersion(): Promise<string> {
  const cachedVersion = getFromCache<string>(CACHE_KEYS.VERSION);
  if (cachedVersion) {
    console.log(`[DDragon] Using cached version: ${cachedVersion}`);
    return cachedVersion;
  }

  try {
    const response = await fetch(`${DDRAGON_BASE}/api/versions.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch versions: ${response.status}`);
    }

    const versions: string[] = await response.json();
    const latestVersion = versions[0];

    console.log(`[DDragon] Fetched latest version: ${latestVersion}`);
    setCache(CACHE_KEYS.VERSION, latestVersion);

    return latestVersion;
  } catch (error) {
    console.error("[DDragon] Failed to fetch version:", error);
    return "14.24.1";
  }
}

async function fetchChampions(version: string): Promise<{
  champions: Champion[];
  championMap: Record<number, { name: string; id: string }>;
}> {
  const cachedChampions = getFromCache<Champion[]>(CACHE_KEYS.CHAMPIONS);
  const cachedMap = getFromCache<Record<number, { name: string; id: string }>>(
    CACHE_KEYS.CHAMPION_MAP
  );

  if (cachedChampions && cachedMap) {
    console.log(`[DDragon] Using cached champions (${cachedChampions.length} champions)`);
    return { champions: cachedChampions, championMap: cachedMap };
  }

  try {
    const response = await fetch(
      `${DDRAGON_BASE}/cdn/${version}/data/fr_FR/champion.json`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch champions: ${response.status}`);
    }

    const data = await response.json();

    const champions: Champion[] = [];
    const championMap: Record<number, { name: string; id: string }> = {};

    Object.values(data.data).forEach((champ: any) => {
      const id = parseInt(champ.key);
      champions.push({
        id,
        name: champ.name,
        key: champ.id,
      });
      championMap[id] = {
        name: champ.name,
        id: champ.id,
      };
    });

    champions.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[DDragon] Fetched ${champions.length} champions`);

    setCache(CACHE_KEYS.CHAMPIONS, champions);
    setCache(CACHE_KEYS.CHAMPION_MAP, championMap);

    return { champions, championMap };
  } catch (error) {
    console.error("[DDragon] Failed to fetch champions:", error);
    const fallbackMap: Record<number, { name: string; id: string }> = {};
    STATIC_CHAMPIONS.forEach((champ) => {
      fallbackMap[champ.id] = { name: champ.name, id: champ.key };
    });
    return { champions: STATIC_CHAMPIONS, championMap: fallbackMap };
  }
}

export async function initDDragon(): Promise<void> {
  if (state.initialized) {
    return;
  }

  try {
    console.log("[DDragon] Initializing...");

    const version = await fetchLatestVersion();
    state.version = version;

    const { champions, championMap } = await fetchChampions(version);
    state.champions = champions;
    state.championMap = championMap;

    state.initialized = true;
    console.log(`[DDragon] Initialized with version ${version}, ${champions.length} champions`);
  } catch (error) {
    console.error("[DDragon] Initialization failed, using static fallback:", error);
    state.initialized = true;
  }
}

export async function refreshDDragon(): Promise<void> {
  localStorage.removeItem(CACHE_KEYS.VERSION);
  localStorage.removeItem(CACHE_KEYS.CHAMPIONS);
  localStorage.removeItem(CACHE_KEYS.CHAMPION_MAP);

  state.initialized = false;
  await initDDragon();
}

export function getDDragonVersion(): string {
  return state.version || "14.24.1";
}

export function getChampions(): Champion[] {
  return state.champions;
}

export function getChampionById(id: number): Champion | undefined {
  return state.champions.find((c) => c.id === id);
}

export function getChampionByName(name: string): Champion | undefined {
  return state.champions.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}

export function getChampionMap(): Record<number, { name: string; id: string }> {
  return state.championMap;
}

export function getChampionIconUrl(championKey: string): string {
  const version = getDDragonVersion();
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championKey}.png`;
}

export function getProfileIconUrl(iconId: number): string {
  const version = getDDragonVersion();
  return `${DDRAGON_BASE}/cdn/${version}/img/profileicon/${iconId}.png`;
}
