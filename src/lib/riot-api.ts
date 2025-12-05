import { Region } from "@/types/account";
import { RankDivision, RankTier } from "@/types/account";
import { getChampionMap, getProfileIconUrl, getChampionIconUrl } from "@/lib/ddragon";

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

export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
  championName?: string;
  championIcon?: string;
}

export interface MatchHistoryEntry {
  matchId: string;
  champion: string;
  championIcon: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gameMode: string;
  gameDuration: number;
  timestamp: number;
  cs: number;
}

export interface DetailedStats {
  championMastery: ChampionMastery[];
  matchHistory: MatchHistoryEntry[];
  winrate: {
    wins: number;
    losses: number;
    total: number;
    percentage: number;
  };
  averageKDA: {
    kills: number;
    deaths: number;
    assists: number;
    ratio: number;
  };
  averageCS: number;
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

    // Data Dragon profile icon (version dynamique)
    const iconUrl = getProfileIconUrl(summonerData.profileIconId);

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

// Champion data - utilise le service DDragon centralisé
async function getChampionData(): Promise<Record<number, { name: string; id: string }>> {
  return getChampionMap();
}

export async function fetchDetailedStats(
  summonerName: string,
  region: Region
): Promise<DetailedStats> {
  try {
    const routing = REGION_ROUTING[region];
    const platform = REGION_PLATFORM[region];

    // 1) Get PUUID
    const [gameName, tagLineFallback] = summonerName.split("#");
    const tagLine = tagLineFallback || region;
    const accountUrl = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;

    const accountResponse = await rateLimitedFetch(accountUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    if (!accountResponse.ok) {
      throw new Error(`Summoner not found: ${accountResponse.status}`);
    }
    const accountData = await accountResponse.json();
    const puuid: string = accountData.puuid;

    // Get champion data for mapping
    const championData = await getChampionData();

    // 2) Fetch Champion Mastery (top 5)
    const masteryUrl = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=5`;
    const masteryResponse = await rateLimitedFetch(masteryUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    let championMastery: ChampionMastery[] = [];
    if (masteryResponse.ok) {
      const masteryData = await masteryResponse.json();
      championMastery = masteryData.map((m: any) => {
        const champ = championData[m.championId];
        return {
          championId: m.championId,
          championLevel: m.championLevel,
          championPoints: m.championPoints,
          championName: champ?.name || `Champion ${m.championId}`,
          championIcon: champ?.id ? getChampionIconUrl(champ.id) : undefined
        };
      });
    }

    // 3) Fetch Match History
    // Get current season start timestamp (Season 2025 started January 9, 2025)
    const season2025Start = new Date('2025-01-09').getTime();

    // Fetch only 30 matches for faster loading (good balance between stats accuracy and speed)
    const matchIdsUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=30&startTime=${Math.floor(season2025Start / 1000)}`;
    const matchIdsResponse = await rateLimitedFetch(matchIdsUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });

    let matchHistory: MatchHistoryEntry[] = [];
    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let totalCS = 0;
    let wins = 0;
    let losses = 0;

    if (matchIdsResponse.ok) {
      const matchIds: string[] = await matchIdsResponse.json();

      // Fetch matches in batches to respect rate limits and improve performance
      const BATCH_SIZE = 10; // Process 10 matches at a time for faster loading
      const allMatches: MatchHistoryEntry[] = [];

      for (let i = 0; i < matchIds.length; i += BATCH_SIZE) {
        const batch = matchIds.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (matchId) => {
          const matchUrl = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
          const matchResponse = await rateLimitedFetch(matchUrl, {
            headers: { "X-Riot-Token": RIOT_API_KEY },
          });

          if (!matchResponse.ok) return null;

          const matchData = await matchResponse.json();
          const participant = matchData.info.participants.find((p: any) => p.puuid === puuid);

          if (!participant) return null;

          const champ = championData[participant.championId];
          const win = participant.win;
          const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;

          if (win) wins++;
          else losses++;

          totalKills += participant.kills;
          totalDeaths += participant.deaths;
          totalAssists += participant.assists;
          totalCS += cs;

          return {
            matchId,
            champion: champ?.name || `Champion ${participant.championId}`,
            championIcon: champ?.id ? getChampionIconUrl(champ.id) : '',
            win,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            gameMode: matchData.info.gameMode,
            gameDuration: matchData.info.gameDuration,
            timestamp: matchData.info.gameCreation,
            cs
          };
        });

        const batchResults = await Promise.all(batchPromises);
        allMatches.push(...batchResults.filter((m): m is MatchHistoryEntry => m !== null));
      }

      // Keep only first 10 for display in history
      matchHistory = allMatches.slice(0, 10);
    }

    // Calculate averages based on ALL matches, not just the 10 displayed
    const totalGamesPlayed = wins + losses;
    const gamesPlayed = totalGamesPlayed || 1;
    const avgKills = totalKills / gamesPlayed;
    const avgDeaths = totalDeaths / gamesPlayed || 1;
    const avgAssists = totalAssists / gamesPlayed;
    const avgCS = totalCS / gamesPlayed;
    const kdaRatio = (avgKills + avgAssists) / avgDeaths;

    const total = wins + losses;
    const winrate = total > 0 ? (wins / total) * 100 : 0;

    return {
      championMastery,
      matchHistory,
      winrate: {
        wins,
        losses,
        total,
        percentage: winrate
      },
      averageKDA: {
        kills: avgKills,
        deaths: avgDeaths,
        assists: avgAssists,
        ratio: kdaRatio
      },
      averageCS: avgCS
    };
  } catch (error) {
    console.error("Failed to fetch detailed stats:", error);
    throw error;
  }
}
