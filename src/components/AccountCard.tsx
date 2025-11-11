import { useState } from "react";
import { Account } from "@/types/account";
import { RankBadge } from "./RankBadge";
import { Button } from "./ui/button";
import { Eye, EyeOff, Copy, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

export const AccountCard = ({ account, onEdit, onDelete }: AccountCardProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border">
      <div className="flex items-start gap-4">
        {/* Summoner Icon */}
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {account.iconUrl ? (
            <img src={account.iconUrl} alt={account.summonerName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">
              {account.summonerName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-semibold text-lg text-card-foreground truncate">
                {account.summonerName}
              </h3>
              {account.accountName && (
                <p className="text-sm text-muted-foreground">{account.accountName}</p>
              )}
            </div>
            <RankBadge tier={account.rankTier} division={account.rankDivision} />
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Region:</span>
              <span className="font-medium text-card-foreground">{account.region}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Games:</span>
              <span className="font-medium text-card-foreground">{account.gamesCount}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Login:</span>
              <span className="font-mono text-card-foreground">••••••</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(account.login, "Login")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Password:</span>
              <span className={cn("font-mono text-card-foreground", !showPassword && "select-none")}>
                {showPassword ? account.password : "••••••••"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              {showPassword && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(account.password, "Password")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {account.notes && (
            <p className="text-sm text-muted-foreground mb-4 italic">{account.notes}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onEdit(account)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => onDelete(account.id)}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
