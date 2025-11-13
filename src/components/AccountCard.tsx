import { useState } from "react";
import { Account } from "@/types/account";
import { RankBadge } from "./RankBadge";
import { Button } from "./ui/button";
import { Eye, EyeOff, Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Clipboard, Edit2 } from "lucide-react";
import { rankEmblemUrl } from "@/lib/rank";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}


export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const { toast } = useToast();

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
  
    const soloTier = account.rankTier;
    const flexTier = account.flexRankTier ?? "Unranked";

    const soloEmblemSrc = rankEmblemUrl[soloTier];
    const flexEmblemSrc = rankEmblemUrl[flexTier];

  return (
    <div className="flex items-center gap-4 px-4 py-3">
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
            className="inline-flex items-center gap-1 text-sm font-semibold text-card-foreground hover:underline decoration-dotted"
          >
            {account.summonerName}
            <Clipboard className="w-3 h-3 opacity-70" />
          </button>

          <span className="text-xs text-muted-foreground">
            {account.accountName}
          </span>
        </div>
      </div>

      {/* Rang + logo */}
      <div className="flex items-center gap-8 min-w-[360px]">
        {/* SOLOQ */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src={soloEmblemSrc}
              alt={soloTier}
              className="max-w-full max-h-full object-contain drop-shadow-md"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase text-muted-foreground tracking-wide">
              SoloQ
            </span>
            <span className="text-sm font-medium">
              {soloTier === "Unranked"
                ? "Unranked"
                : `${soloTier} ${account.rankDivision ?? ""}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {(account.gamesCount ?? 0)} games
            </span>
          </div>
        </div>

        {/* FLEX */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 flex items-center justify-center">
            <img
              src={flexEmblemSrc}
              alt={flexTier}
              className="max-w-full max-h-full object-contain drop-shadow-md"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase text-muted-foreground tracking-wide">
              Flex
            </span>
            <span className="text-sm font-medium">
              {flexTier === "Unranked"
                ? "Unranked"
                : `${flexTier} ${account.flexRankDivision ?? ""}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {(account.flexGamesCount ?? 0)} games
            </span>
          </div>
        </div>
      </div>
      {/* Région */}
      <div className="text-sm text-muted-foreground min-w-[80px]">
        {account.region}
      </div>

      {/* Actions (login/mdp, edit/delete, etc. à adapter) */}
      <div className="ml-auto flex items-center gap-2">
        {/* Tu peux afficher le login/mot de passe masqué ici aussi si tu veux */}
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
  );
};