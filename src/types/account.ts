export type RankTier = 
  | "Iron" 
  | "Bronze" 
  | "Silver" 
  | "Gold" 
  | "Platinum" 
  | "Emerald" 
  | "Diamond" 
  | "Master" 
  | "Grandmaster" 
  | "Challenger"
  | "Unranked";

export type RankDivision = "I" | "II" | "III" | "IV";

export type Region = "EUW" | "EUNE" | "NA" | "KR" | "BR" | "LAN" | "LAS" | "OCE" | "RU" | "TR" | "JP";

export interface Account {
  id: string;
  accountName: string;
  summonerName: string;
  region: Region;

  // SOLOQ
  rankTier: RankTier;
  rankDivision?: RankDivision;
  gamesCount: number;
  leaguePoints?: number; // LP for Master, Grandmaster, Challenger

  // FLEX
  flexRankTier?: RankTier;
  flexRankDivision?: RankDivision;
  flexGamesCount?: number;
  flexLeaguePoints?: number; // LP for Master, Grandmaster, Challenger in Flex

  login: string;
  password: string;
  iconUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
