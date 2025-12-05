import { Account } from "@/types/account";
import { Button } from "./ui/button";
import { Clipboard, Edit2, Trash2, RefreshCw, ChevronDown, ChevronUp, GripVertical, Clock, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { rankEmblemUrl } from "@/lib/rank";
import { memo, useState } from "react";
import { fetchDetailedStats, DetailedStats } from "@/lib/riot-api";
import { AccountDetailsPanel } from "./AccountDetailsPanel";
import { getDecayInfo } from "@/lib/decay";

// Helper function to get decay color based on days remaining
function getDecayColor(days: number | undefined): string {
  if (days === undefined || days < 0) return "";
  if (days <= 3) return "text-red-500"; // Critical - 3 days or less
  if (days <= 7) return "text-orange-500"; // Warning - 7 days or less
  if (days <= 14) return "text-yellow-500"; // Caution - 14 days or less
  return "text-green-500"; // Safe - more than 14 days
}

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onLogin: (account: Account) => void;
  onRefresh: (accountId: string) => void;
  loginState?: LoginStatusPayload;
  loginDisabled?: boolean;
  loginDisabledReason?: string;
  draggable?: boolean;
  onDragStart?: (account: Account) => void;
  onDragEnter?: (account: Account) => void;
  onDragEnd?: () => void;
}

export const AccountCard = memo(function AccountCard({
  account,
  onEdit,
  onDelete,
  onLogin,
  onRefresh,
  loginState,
  loginDisabled = false,
  loginDisabledReason,
  draggable = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: AccountCardProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const handleCopySummonerName = async () => {
    try {
      await navigator.clipboard.writeText(account.summonerName);
      toast({
        title: "Copied",
        description: `Summoner name "${account.summonerName}" copied to clipboard.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to copy summoner name.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh(account.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleExpand = async () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // If expanding and stats not loaded yet, fetch them
    if (newExpanded && !detailedStats && !isLoadingStats) {
      setIsLoadingStats(true);
      setStatsError(null);
      try {
        const stats = await fetchDetailedStats(account.summonerName, account.region);
        setDetailedStats(stats);
      } catch (error) {
        console.error("Failed to fetch detailed stats:", error);
        setStatsError(
          error instanceof Error
            ? error.message
            : "Failed to load detailed statistics."
        );
      } finally {
        setIsLoadingStats(false);
      }
    }
  };

  const soloTier = account.rankTier;
  const flexTier = account.flexRankTier ?? "Unranked";

  const soloEmblemSrc = rankEmblemUrl[soloTier];
  const flexEmblemSrc = rankEmblemUrl[flexTier];

  // Calculate adjusted decay based on elapsed time
  const soloDecay = getDecayInfo(account.soloDecayDays, account.decayLastUpdated);
  const flexDecay = getDecayInfo(account.flexDecayDays, account.decayLastUpdated);

  const isLoginInProgress =
    !!loginState && loginState.kind !== "error" && loginState.kind !== "success";
  const loginStatusMessage =
    loginState?.message ??
    (loginState?.kind === "error"
      ? "Connection failed."
      : loginState?.kind === "success"
      ? "Connection launched to League."
      : undefined);
  const loginButtonDisabled = loginDisabled || isLoginInProgress;
  const loginButtonLabel = isLoginInProgress ? "Connecting..." : "Connect";
  const loginStatusTone =
    loginState?.kind === "error"
      ? "text-destructive"
      : loginState?.kind === "success"
      ? "text-emerald-400"
      : "text-muted-foreground";
  const loginButtonTitle =
    loginDisabledReason ?? (isLoginInProgress ? "Connecting..." : undefined);

  return (
    <div>
      <div
        className={cn(
          "relative flex items-center gap-4 py-3 transition-all duration-200 rounded-lg",
          "hover:bg-accent/20 hover:shadow-sm",
          "cursor-pointer",
          draggable ? "pl-8 pr-4" : "px-4"
        )}
        draggable={draggable}
        onClick={handleToggleExpand}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart?.(account);
        }}
        onDragEnter={() => onDragEnter?.(account)}
        onDragEnd={() => onDragEnd?.()}
        onDragOver={(event) => event.preventDefault()}
      >
      {/* Drag indicator - far left */}
      {draggable && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
          <GripVertical className="h-5 w-5 text-muted-foreground/30" />
        </div>
      )}

      {/* Icône invocateur */}
      <div className="flex items-center gap-3 min-w-[220px]">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {account.iconUrl ? (
            <img
              src={account.iconUrl}
              alt={account.summonerName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No icon</span>
          )}
        </div>

        <div className="flex flex-col">
          {/* Pseudo cliquable pour copier */}
          <button
            type="button"
            onClick={handleCopySummonerName}
            className="inline-flex items-center gap-1 text-sm font-semibold text-card-foreground hover:underline decoration-dotted cursor-pointer"
          >
            {account.summonerName}
            <Clipboard className="w-3 h-3 opacity-70" />
          </button>

          <span className="text-xs text-muted-foreground">
            {account.accountName}
          </span>

          {/* Région */}
          <span className="text-xs text-muted-foreground font-medium">
            {account.region}
          </span>
        </div>
      </div>

      {/* Rang + logo */}
      <div className="flex items-center gap-6 min-w-[440px]">
        {/* SOLOQ */}
        <div className="flex items-center gap-3 w-[190px]">
          <div className="w-16 h-16 flex-shrink-0">
            <img
              src={soloEmblemSrc}
              alt={soloTier}
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs uppercase text-muted-foreground tracking-wide">
              SoloQ
            </span>
            <span className="text-sm font-medium">
              {soloTier === "Unranked"
                ? "Unranked"
                : `${soloTier} ${account.rankDivision ?? ""} ${account.leaguePoints ?? 0} LP`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {(account.gamesCount ?? 0)} games
              </span>
              {soloDecay.days !== undefined && soloDecay.days >= 0 && (
                <span
                  className={cn("text-xs font-medium flex items-center gap-1", getDecayColor(soloDecay.days))}
                  title={soloDecay.isEstimate ? "Estimate based on elapsed time" : undefined}
                >
                  <Clock className="h-3 w-3" />
                  {soloDecay.isEstimate ? "~" : ""}{soloDecay.days}d
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FLEX */}
        <div className="flex items-center gap-3 w-[190px]">
          <div className="w-16 h-16 flex-shrink-0">
            <img
              src={flexEmblemSrc}
              alt={flexTier}
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs uppercase text-muted-foreground tracking-wide">
              Flex
            </span>
            <span className="text-sm font-medium">
              {flexTier === "Unranked"
                ? "Unranked"
                : `${flexTier} ${account.flexRankDivision ?? ""} ${account.flexLeaguePoints ?? 0} LP`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {(account.flexGamesCount ?? 0)} games
              </span>
              {flexDecay.days !== undefined && flexDecay.days >= 0 && (
                <span
                  className={cn("text-xs font-medium flex items-center gap-1", getDecayColor(flexDecay.days))}
                  title={flexDecay.isEstimate ? "Estimate based on elapsed time" : undefined}
                >
                  <Clock className="h-3 w-3" />
                  {flexDecay.isEstimate ? "~" : ""}{flexDecay.days}d
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="ml-auto flex flex-col gap-3 md:flex-row md:items-center md:gap-4 pr-12">
        <div className="relative">
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 w-[140px]"
            onClick={(e) => {
              e.stopPropagation();
              onLogin(account);
            }}
            disabled={loginButtonDisabled}
            title={loginButtonTitle}
          >
            <LogIn className="w-4 h-4" />
            {loginButtonLabel}
          </Button>
          {loginStatusMessage && (
            <span className={cn("text-xs absolute right-0 top-full mt-1 whitespace-nowrap", loginStatusTone)}>{loginStatusMessage}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            disabled={isRefreshing}
            className="gap-1"
            title="Refresh this account"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />

          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className="gap-1"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(account.id);
            }}
            className="gap-1 text-destructive border-destructive/40"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

        {/* Expand/Collapse Icon - Fixed position */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Detailed Stats Panel */}
      {isExpanded && (
        <AccountDetailsPanel
          stats={detailedStats}
          isLoading={isLoadingStats}
          error={statsError}
        />
      )}
    </div>
  );
});
