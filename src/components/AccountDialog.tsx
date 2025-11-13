import { useState, useEffect } from "react";
import { Account, RankTier, RankDivision, Region } from "@/types/account";
import { fetchSummonerData } from "@/lib/riot-api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  onSave: (account: Account) => void;
}

const rankTiers: RankTier[] = [
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

const regions: Region[] = [
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

export const AccountDialog = ({
  open,
  onOpenChange,
  account,
  onSave,
}: AccountDialogProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Account>>({
    accountName: "",
    summonerName: "",
    region: "EUW",
    rankTier: "Unranked",
    gamesCount: 0,
    login: "",
    password: "",
    iconUrl: "",
    notes: "",
  });

  useEffect(() => {
    if (account) {
      setFormData(account);
    } else {
      setFormData({
        accountName: "",
        summonerName: "",
        region: "EUW",
        rankTier: "Unranked",
        gamesCount: 0,
        login: "",
        password: "",
        iconUrl: "",
        notes: "",
      });
    }
  }, [account, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date().toISOString();
    const savedAccount: Account = {
      id: account?.id || crypto.randomUUID(),
      accountName: formData.accountName || "",
      summonerName: formData.summonerName || "",
      region: formData.region as Region,
      rankTier: formData.rankTier as RankTier,
      rankDivision: formData.rankDivision as RankDivision | undefined,
      gamesCount: formData.gamesCount ?? account?.gamesCount ?? 0,
      login: formData.login || "",
      password: formData.password || "",
      iconUrl: formData.iconUrl,
      notes: formData.notes,
      createdAt: account?.createdAt || now,
      updatedAt: now,
    };

    onSave(savedAccount);
    onOpenChange(false);
  };

  const handleFetchFromRiot = async () => {
    if (!formData.summonerName || !formData.region) {
      toast({
        title: "Missing Information",
        description: "Please enter a summoner name and select a region first",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      const data = await fetchSummonerData(
        formData.summonerName,
        formData.region
      );

      setFormData((prev) => ({
        ...prev,
        summonerName: data.summonerName,
        iconUrl: data.iconUrl,
        // Ces champs restent gérés automatiquement, même s'ils ne sont plus dans l'UI

        soloRankTier: data.soloRankTier as RankTier,
        soloRankDivision : data.soloRankDivision as RankDivision,
        soloGamesCount: data.soloGamesCount,
        flexRankTier: data.flexRankTier as RankTier,
        flexRankDivision: data.flexRankDivision as RankDivision,
        flexGamesCount: data.flexGamesCount

      }));

      toast({
        title: "Success",
        description: "Account data fetched from Riot API",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch data from Riot API",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit Account" : "Add New Account"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="summonerName">Summoner Name *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchFromRiot}
                  disabled={isFetching}
                  className="h-7 text-xs"
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    "Fetch from Riot"
                  )}
                </Button>
              </div>
              <Input
                id="summonerName"
                value={formData.summonerName}
                onChange={(e) =>
                  setFormData({ ...formData, summonerName: e.target.value })
                }
                placeholder="Faker#KR1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Label</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={(e) =>
                  setFormData({ ...formData, accountName: e.target.value })
                }
                placeholder="e.g., Main, Smurf"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="login">Login *</Label>
              <Input
                id="login"
                value={formData.login}
                onChange={(e) =>
                  setFormData({ ...formData, login: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">Icon URL (optional)</Label>
            <Input
              id="iconUrl"
              value={formData.iconUrl}
              onChange={(e) =>
                setFormData({ ...formData, iconUrl: e.target.value })
              }
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {account ? "Save Changes" : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
