import { Account } from "@/types/account";
import { Button } from "./ui/button";
import { Clipboard, Edit2, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { rankEmblemUrl } from "@/lib/rank";
import { memo, useState } from "react";

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

  const soloTier = account.rankTier;
  const flexTier = account.flexRankTier ?? "Unranked";

  const soloEmblemSrc = rankEmblemUrl[soloTier];
  const flexEmblemSrc = rankEmblemUrl[flexTier];

  const isLoginInProgress =
    !!loginState && loginState.kind !== "error" && loginState.kind !== "success";
  const loginStatusMessage =
    loginState?.message ??
    (loginState?.kind === "error"
      ? "Échec de la connexion."
      : loginState?.kind === "success"
      ? "Connexion lancée sur League."
      : undefined);
  const loginButtonDisabled = loginDisabled || isLoginInProgress;
  const loginButtonLabel = isLoginInProgress ? "Connexion..." : "Se connecter";
  const loginStatusTone =
    loginState?.kind === "error"
      ? "text-destructive"
      : loginState?.kind === "success"
      ? "text-emerald-400"
      : "text-muted-foreground";
  const loginButtonTitle =
    loginDisabledReason ?? (isLoginInProgress ? "Connexion en cours..." : undefined);

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3",
        draggable && "cursor-move"
      )}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(account);
      }}
      onDragEnter={() => onDragEnter?.(account)}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={(event) => event.preventDefault()}
    >
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
      <div className="flex items-center gap-6 min-w-[380px]">
        {/* SOLOQ */}
        <div className="flex items-center gap-3 w-[160px]">
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
                : (soloTier === "Master" || soloTier === "Grandmaster" || soloTier === "Challenger")
                ? `${soloTier} ${account.leaguePoints ?? 0} LP`
                : `${soloTier} ${account.rankDivision ?? ""}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {(account.gamesCount ?? 0)} games
            </span>
          </div>
        </div>

        {/* FLEX */}
        <div className="flex items-center gap-3 w-[160px]">
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
                : (flexTier === "Master" || flexTier === "Grandmaster" || flexTier === "Challenger")
                ? `${flexTier} ${account.flexLeaguePoints ?? 0} LP`
                : `${flexTier} ${account.flexRankDivision ?? ""}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {(account.flexGamesCount ?? 0)} games
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="ml-auto flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex flex-col gap-1 min-w-[170px]">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={() => onLogin(account)}
            disabled={loginButtonDisabled}
            title={loginButtonTitle}
          >
            {loginButtonLabel}
          </Button>
          {loginStatusMessage && (
            <span className={cn("text-xs", loginStatusTone)}>{loginStatusMessage}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1"
            title="Rafraîchir ce compte"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(account)}
            className="gap-1"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(account.id)}
            className="gap-1 text-destructive border-destructive/40"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
});
