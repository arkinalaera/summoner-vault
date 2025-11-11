import { Region } from "@/types/account";

// IMPORTANT: Replace with your Riot API key from https://developer.riotgames.com/
const RIOT_API_KEY = "RGAPI-your-api-key-here";

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
  rankTier: string;
  rankDivision?: string;
  gamesCount: number;
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

    // Step 1: Get summoner by name (using Riot ID)
    const accountUrl = `https://${routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      summonerName.split("#")[0]
    )}/${encodeURIComponent(summonerName.split("#")[1] || region)}`;

    const accountResponse = await fetch(accountUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (!accountResponse.ok) {
      throw new Error(`Summoner not found: ${accountResponse.statusText}`);
    }

    const accountData = await accountResponse.json();
    const puuid = accountData.puuid;

    // Step 2: Get summoner data from platform
    const summonerUrl = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;

    const summonerResponse = await fetch(summonerUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (!summonerResponse.ok) {
      throw new Error(`Failed to fetch summoner data: ${summonerResponse.statusText}`);
    }

    const summonerData = await summonerResponse.json();

    // Step 3: Get ranked stats
    const rankedUrl = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`;

    const rankedResponse = await fetch(rankedUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });

    if (!rankedResponse.ok) {
      throw new Error(`Failed to fetch ranked data: ${rankedResponse.statusText}`);
    }

    const rankedData = await rankedResponse.json();
    const soloQueue = rankedData.find(
      (queue: any) => queue.queueType === "RANKED_SOLO_5x5"
    );

    // Build icon URL (using Data Dragon)
    const iconUrl = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${summonerData.profileIconId}.png`;

    return {
      summonerName: `${accountData.gameName}#${accountData.tagLine}`,
      iconUrl,
      rankTier: soloQueue?.tier || "Unranked",
      rankDivision: soloQueue?.rank,
      gamesCount: soloQueue ? soloQueue.wins + soloQueue.losses : 0,
    };
  } catch (error) {
    console.error("Riot API Error:", error);
    throw error;
  }
}
