import { RankTier, Region } from "@/types/account";

/**
 * All available rank tiers in League of Legends
 */
export const RANK_TIERS: RankTier[] = [
  "Unranked",
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
];

/**
 * All available regions
 */
export const REGIONS: Region[] = [
  "EUW",
  "EUNE",
  "NA",
  "KR",
  "BR",
  "LAN",
  "LAS",
  "OCE",
  "RU",
  "TR",
  "JP",
];

/**
 * API and caching configuration
 */
export const API_CONFIG = {
  RATE_LIMIT_PER_SECOND: 19, // Riot API limit is 20, use 19 for safety margin
  RATE_LIMIT_WINDOW: 1000, // 1 second
  CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
  DATA_DRAGON_VERSION: "14.1.1",
  RETRY_DELAY: 2000, // 2 seconds default retry delay for 429 errors
} as const;
