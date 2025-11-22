import { Region } from "@/types/account";
import { RankDivision,RankTier } from "@/types/account";
import { Underline } from "lucide-react";

// Default API key (fallback if user doesn't provide their own)
const DEFAULT_RIOT_API_KEY = "RGAPI-62da639c-d4dc-447d-817c-538ffbbcc098";

// Current API key (will be loaded from settings)
let RIOT_API_KEY = DEFAULT_RIOT_API_KEY;

// Function to get API key from settings
async function getApiKey(): Promise<string> {
  try {
    const api = (window as any).api;
    if (api?.getRiotApiKey) {
      const customKey = await api.getRiotApiKey();
      if (customKey && customKey.trim().length > 0) {
        return customKey;
      }
    }
  } catch (error) {
    console.warn("Failed to get custom API key, using default:", error);
  }
  return DEFAULT_RIOT_API_KEY;
}

// Initialize API key on module load
getApiKey().then((key) => {
  RIOT_API_KEY = key;
});

// Export function to reload API key (call this after user updates it in settings)
export async function reloadApiKey(): Promise<void> {
  RIOT_API_KEY = await getApiKey();
  console.log("Riot API key reloaded");
}

// Rate limiting: max 20 req/sec, 100 req/2min
let requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
let requestCount = 0;
let requestCountWindow = Date.now();

const RATE_LIMIT_PER_SECOND = 19; // Slightly below the limit for safety
const RATE_LIMIT_WINDOW = 1000; // 1 second

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  // Reset counter if we're in a new window
  const now = Date.now();
  if (now - requestCountWindow > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    requestCountWindow = now;
  }

  // If we've hit the limit, wait
  if (requestCount >= RATE_LIMIT_PER_SECOND) {
    const waitTime = RATE_LIMIT_WINDOW - (now - requestCountWindow);
    if (waitTime > 0) {
      await delay(waitTime);
    }
    requestCount = 0;
    requestCountWindow = Date.now();
  }

  requestCount++;

  const response = await fetch(url, options);

  // Handle 429 (rate limit exceeded)
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;

    console.warn(`Rate limit hit, waiting ${waitTime}ms before retry...`);
    await delay(waitTime);

    // Retry the request
    return rateLimitedFetch(url, options);
  }

  return response;
}

const REGION_ROUTING: Record<Region, string> = {
  EUW: "europe",
  EUNE: "europe",
  NA: "americas",
  BR: "americas",
  LAN: "americas",
  LAS: "americas",
  OCE: "sea",
  KR: "asia",
  JP: "asia",
  RU: "europe",
  TR: "europe",
};

const REGION_PLATFORM: Record<Region, string> = {
  EUW: "euw1",
  EUNE: "eun1",
  NA: "na1",
  BR: "br1",
  LAN: "lan",
  LAS: "las",
  OCE: "oc1",
  KR: "kr",
  JP: "jp1",
  RU: "ru",
  TR: "tr1",
};

export interface RiotSummonerData {
  summonerName: string;
  iconUrl: string;
  soloRankTier: string;
  soloRankDivision?: string;
  soloGamesCount: number;
  soloLeaguePoints: number;
  flexRankTier: string;
  flexRankDivision?: string;
  flexGamesCount: number;
  flexLeaguePoints: number;
}

type RankedEntry = {
  leagueId: string;
  puuid: string;
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR" | string;
  tier: string;      // e.g. "EMERALD"
  rank: string;      // e.g. "II"
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
  miniSeries?: {
    losses: number;
    progress: string;
    target: number;
    wins: number;
  };
  summonerId?: string;     // parfois présent
  summonerName?: string;   // parfois présent
};

export function normalizeTier(tier?: string): RankTier {
  if (!tier) return "Unranked";

  const mapping: Record<string, RankTier> = {
    IRON: "Iron",
    BRONZE: "Bronze",
    SILVER: "Silver",
    GOLD: "Gold",
    PLATINUM: "Platinum",
    EMERALD: "Emerald",
    DIAMOND: "Diamond",
    MASTER: "Master",
    GRANDMASTER: "Grandmaster",
    CHALLENGER: "Challenger",
  };

  return mapping[tier] ?? "Unranked";
}

export function normalizeDivision(rank?: string): RankDivision | undefined {
  if (!rank) return undefined;

  const allowed: RankDivision[] = ["I", "II", "III", "IV"];
  
  return allowed.includes(rank as RankDivision)
    ? (rank as RankDivision)
    : undefined;
}

export async function fetchSummonerData(
  summonerName: string,
  region: Region
): Promise<RiotSummonerData> {
  if (RIOT_API_KEY === "RGAPI-your-api-key-here") {
    throw new Error(
      "Please add your Riot API key in src/lib/riot-api.ts. Get one from https://developer.riotgames.com/"
    );
  }

  try {
    const routing = REGION_ROUTING[region];
    const platform = REGION_PLATFORM[region];

    // 1) Get account by Riot ID → PUUID
    const [gameName, tagLineFallback] = summonerName.split("#");
    const tagLine = tagLineFallback || region; // fallback simple si pas de tag
    const accountUrl = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;

    const accountResponse = await rateLimitedFetch(accountUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    if (!accountResponse.ok) {
      throw new Error(`Summoner not found: ${accountResponse.status} ${accountResponse.statusText}`);
    }
    const accountData = await accountResponse.json();
    const puuid: string = accountData.puuid;

    // 2) Get summoner (profile icon, etc.) from PUUID
    const summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const summonerResponse = await rateLimitedFetch(summonerUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    if (!summonerResponse.ok) {
      throw new Error(`Failed to fetch summoner data: ${summonerResponse.status} ${summonerResponse.statusText}`);
    }
    const summonerData = await summonerResponse.json();

    // 3) Get ranked entries BY **PUUID** (✅ new endpoint)
    const rankedUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    const rankedResponse = await rateLimitedFetch(rankedUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    if (!rankedResponse.ok) {
      throw new Error(`Failed to fetch ranked data: ${rankedResponse.status} ${rankedResponse.statusText}`);
    }
    const rankedData: RankedEntry[] = await rankedResponse.json();

    const soloQueue = rankedData.find(
      (queue: any) => queue.queueType === "RANKED_SOLO_5x5"
    );
    const flexQueue = rankedData.find(
      (queue: any) => queue.queueType === "RANKED_FLEX_SR"
    );

    const soloGames = soloQueue ? (soloQueue.wins ?? 0) + (soloQueue.losses ?? 0) : 0;
    const flexGames = flexQueue ? (flexQueue.wins ?? 0) + (flexQueue.losses ?? 0) : 0;

    // Data Dragon profile icon (version can be updated dynamically if needed)
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summonerData.profileIconId}.png`;

    return {
      summonerName: `${accountData.gameName}#${accountData.tagLine}`,
      iconUrl,

      // SOLOQ
      soloRankTier: soloQueue?.tier ?? "Unranked",
      soloRankDivision: soloQueue?.rank ?? undefined,
      soloGamesCount: soloGames,
      soloLeaguePoints: soloQueue?.leaguePoints ?? 0,

      // FLEX
      flexRankTier: flexQueue?.tier ?? "Unranked",
      flexRankDivision: flexQueue?.rank ?? undefined,
      flexGamesCount: flexGames,
      flexLeaguePoints: flexQueue?.leaguePoints ?? 0,
    };
  } catch (error) {
    console.error("Riot API Error:", error);
    throw error;
  }
}
