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
  rankTier: RankTier;
  rankDivision?: RankDivision;
  gamesCount: number;
  login: string;
  password: string;
  iconUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
