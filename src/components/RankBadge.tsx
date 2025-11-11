import { RankTier, RankDivision } from "@/types/account";
import { cn } from "@/lib/utils";

interface RankBadgeProps {
  tier: RankTier;
  division?: RankDivision;
  className?: string;
}

const rankColorMap: Record<RankTier, string> = {
  Iron: "bg-rank-iron",
  Bronze: "bg-rank-bronze",
  Silver: "bg-rank-silver",
  Gold: "bg-rank-gold",
  Platinum: "bg-rank-platinum",
  Emerald: "bg-rank-emerald",
  Diamond: "bg-rank-diamond",
  Master: "bg-rank-master",
  Grandmaster: "bg-rank-grandmaster",
  Challenger: "bg-rank-challenger",
  Unranked: "bg-muted",
};

export const RankBadge = ({ tier, division, className }: RankBadgeProps) => {
  const showDivision = tier !== "Master" && tier !== "Grandmaster" && tier !== "Challenger" && tier !== "Unranked";
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium text-white",
        rankColorMap[tier],
        className
      )}
    >
      <span>{tier}</span>
      {showDivision && division && <span>{division}</span>}
    </div>
  );
};
