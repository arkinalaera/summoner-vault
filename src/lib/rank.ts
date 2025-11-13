import type { RankTier } from "@/types/account";

const BASE_RANK_EMBLEM_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images";

export const rankEmblemUrl: Record<RankTier, string> = {
  Unranked: `${BASE_RANK_EMBLEM_URL}/unranked.png`, // ou une icône perso/un placeholder
  Iron: `${BASE_RANK_EMBLEM_URL}/iron.png`,
  Bronze: `${BASE_RANK_EMBLEM_URL}/bronze.png`,
  Silver: `${BASE_RANK_EMBLEM_URL}/silver.png`,
  Gold: `${BASE_RANK_EMBLEM_URL}/gold.png`,
  Platinum: `${BASE_RANK_EMBLEM_URL}/platinum.png`,
  Emerald: `${BASE_RANK_EMBLEM_URL}/emerald.png`,
  Diamond: `${BASE_RANK_EMBLEM_URL}/diamond.png`,
  Master: `${BASE_RANK_EMBLEM_URL}/master.png`,
  Grandmaster: `${BASE_RANK_EMBLEM_URL}/grandmaster.png`,
  Challenger: `${BASE_RANK_EMBLEM_URL}/challenger.png`,
};