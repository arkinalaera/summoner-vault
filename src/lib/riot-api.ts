import { Region } from "@/types/account";
import { RankDivision,RankTier } from "@/types/account";
import { Underline } from "lucide-react";

// IMPORTANT: Replace with your Riot API key from https://developer.riotgames.com/
const RIOT_API_KEY = "RGAPI-62da639c-d4dc-447d-817c-538ffbbcc098";

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
  flexRankTier: string;
  flexRankDivision?: string;
  flexGamesCount: number;
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

    const accountResponse = await fetch(accountUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    if (!accountResponse.ok) {
      throw new Error(`Summoner not found: ${accountResponse.status} ${accountResponse.statusText}`);
    }
    const accountData = await accountResponse.json();
    const puuid: string = accountData.puuid;

    // 2) Get summoner (profile icon, etc.) from PUUID
    const summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const summonerResponse = await fetch(summonerUrl, {
      headers: { "X-Riot-Token": RIOT_API_KEY },
    });
    if (!summonerResponse.ok) {
      throw new Error(`Failed to fetch summoner data: ${summonerResponse.status} ${summonerResponse.statusText}`);
    }
    const summonerData = await summonerResponse.json();

    // 3) Get ranked entries BY **PUUID** (✅ new endpoint)
    const rankedUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
    const rankedResponse = await fetch(rankedUrl, {
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

      // FLEX
      flexRankTier: flexQueue?.tier ?? "Unranked",
      flexRankDivision: flexQueue?.rank ?? undefined,
      flexGamesCount: flexGames,
    };
  } catch (error) {
    console.error("Riot API Error:", error);
    throw error;
  }
}
