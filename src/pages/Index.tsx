import { useState, useEffect, useCallback, useMemo } from "react";
import { Account, RankTier, Region } from "@/types/account";
import { storage } from "@/lib/storage";
import { AccountCard } from "@/components/AccountCard";
import { AccountDialog } from "@/components/AccountDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchSummonerData, reloadApiKey } from "@/lib/riot-api";
import { normalizeDivision,normalizeTier } from "@/lib/riot-api";
import { migrateToEncryptedStorage } from "@/lib/migrateStorage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Filter, Settings, LogOut, RefreshCw, Circle, Smartphone } from "lucide-react";
import chestIcon from "/resources/chest.ico";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Index = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRank, setFilterRank] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [leaguePath, setLeaguePath] = useState("");
  const [isPersistingLeaguePath, setIsPersistingLeaguePath] = useState(false);
  const [loginStatuses, setLoginStatuses] = useState<
    Record<string, LoginStatusPayload | undefined>
  >({});
  const [draggingAccountId, setDraggingAccountId] = useState<string | null>(null);
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [isTogglingAutoAccept, setIsTogglingAutoAccept] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [welcomeApiKey, setWelcomeApiKey] = useState("");
  const [isSavingWelcomeApiKey, setIsSavingWelcomeApiKey] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string>("chat");
  const { toast } = useToast();

  // Helper functions to manage loading state
  const addLoadingOperation = useCallback((operation: string) => {
    setLoadingOperations(prev => [...prev, operation]);
  }, []);

  const removeLoadingOperation = useCallback((operation: string) => {
    setLoadingOperations(prev => prev.filter(op => op !== operation));
  }, []);
  const isLeaguePathMissing = leaguePath.trim().length === 0;
  const disableLoginButtons = isLeaguePathMissing || isPersistingLeaguePath;
  const loginDisabledReason = isLeaguePathMissing
    ? "Définis d'abord le chemin League of Legends."
    : isPersistingLeaguePath
    ? "Sauvegarde du chemin en cours..."
    : undefined;

  useEffect(() => {
    // Migrate existing accounts to encrypted storage
    migrateToEncryptedStorage().then(() => {
      loadAccounts();
      checkFirstLaunch();
    });
  }, []);

  const checkFirstLaunch = async () => {
    const api = window.api;
    if (!api?.getRiotApiKey) return;

    try {
      const existingApiKey = await api.getRiotApiKey();
      // If no API key is set, show welcome dialog
      if (!existingApiKey || existingApiKey.trim().length === 0) {
        setShowWelcomeDialog(true);
      }
    } catch (error) {
      console.error("Failed to check API key:", error);
    }
  };

  // Use useMemo to compute filtered accounts instead of useEffect
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (acc) =>
          acc.summonerName.toLowerCase().includes(lowerQuery) ||
          acc.accountName?.toLowerCase().includes(lowerQuery)
      );
    }

    if (filterRank !== "all") {
      filtered = filtered.filter((acc) => acc.rankTier === filterRank);
    }

    if (filterRegion !== "all") {
      filtered = filtered.filter((acc) => acc.region === filterRegion);
    }

    return filtered;
  }, [accounts, searchQuery, filterRank, filterRegion]);

  useEffect(() => {
    let isMounted = true;
    const fetchLeaguePath = async () => {
      const api = window.api;
      if (!api?.getLeaguePath) {
        return;
      }
      try {
        const storedPath = await api.getLeaguePath();
        if (storedPath && isMounted) {
          setLeaguePath(storedPath);
        }
      } catch (error) {
        console.error("Failed to retrieve League path:", error);
      }
    };

    fetchLeaguePath();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const api = window.api;
    if (!api?.onLoginStatus) {
      return;
    }

    const unsubscribe = api.onLoginStatus((payload) => {
      setLoginStatuses((previous) => ({
        ...previous,
        [payload.accountId]: payload,
      }));

      if (payload.kind === "error") {
        toast({
          title: "Connexion impossible",
          description:
            payload.message ?? "Une erreur est survenue lors de la connexion.",
          variant: "destructive",
        });
      } else if (payload.kind === "success") {
        toast({
          title: "Connexion lancé",
          description:
            payload.message ?? "League of Legends traite la connexion.",
        });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [toast]);

  useEffect(() => {
    const api = window.api;
    if (!api?.onReadyStatus) {
      return;
    }

    const unsubscribe = api.onReadyStatus((payload) => {
      if (!payload) return;
      const message =
        payload.message ?? "Une vérification de partie a été acceptée.";
      if (payload.kind === "error") {
        toast({
          title: "Auto accept",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Auto accept",
          description: message,
        });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [toast]);

  useEffect(() => {
    const api = window.api;
    if (!api?.getAutoAcceptEnabled) {
      return;
    }

    const fetchAutoAccept = async () => {
      try {
        const enabled = await api.getAutoAcceptEnabled();
        setAutoAcceptEnabled(!!enabled);
      } catch (error) {
        console.error("Failed to retrieve auto accept flag:", error);
      }
    };

    fetchAutoAccept();
  }, []);

 const loadAccounts = async () => {
  const localAccounts = await storage.getAccounts();
  setAccounts(localAccounts);

  if (localAccounts.length === 0) {
    return;
  }

  // Cache duration: only refresh accounts older than 10 minutes
  const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();

  // Filter accounts that need refresh (older than 1 hour)
  const accountsToRefresh = localAccounts.filter((acc) => {
    if (!acc.updatedAt) return true; // Refresh if never updated
    const lastUpdate = new Date(acc.updatedAt).getTime();
    return now - lastUpdate > CACHE_DURATION_MS;
  });

  // If no accounts need refresh, we're done
  if (accountsToRefresh.length === 0) {
    console.log("All accounts are up to date (cached within 1 hour)");
    return;
  }

  console.log(`Refreshing ${accountsToRefresh.length}/${localAccounts.length} accounts...`);
  addLoadingOperation(`Syncing ${accountsToRefresh.length} account(s)`);

  // Process accounts sequentially to respect rate limits
  const updatedAccounts = [...localAccounts];

  for (let i = 0; i < accountsToRefresh.length; i++) {
    const acc = accountsToRefresh[i];
    const accountIndex = localAccounts.findIndex((a) => a.id === acc.id);

    try {
      const riot = await fetchSummonerData(acc.summonerName, acc.region);

      const soloTier = normalizeTier(riot.soloRankTier);
      const soloDiv = normalizeDivision(riot.soloRankDivision);
      const flexTier = normalizeTier(riot.flexRankTier);
      const flexDiv = normalizeDivision(riot.flexRankDivision);

      const updated: Account = {
        ...acc,
        summonerName: riot.summonerName,
        iconUrl: riot.iconUrl,

        // SOLOQ
        rankTier: soloTier,
        rankDivision: soloDiv,
        gamesCount: riot.soloGamesCount,
        leaguePoints: riot.soloLeaguePoints,

        // FLEX
        flexRankTier: flexTier,
        flexRankDivision: flexDiv,
        flexGamesCount: riot.flexGamesCount,
        flexLeaguePoints: riot.flexLeaguePoints,

        updatedAt: new Date().toISOString(),
      };

      // Save to storage and update in array
      await storage.updateAccount(updated);
      updatedAccounts[accountIndex] = updated;
    } catch (err) {
      console.error(`Failed to sync ${acc.summonerName}:`, err);
    }
  }

  // Update UI only once after all accounts are processed
  setAccounts(updatedAccounts);
  removeLoadingOperation(`Syncing ${accountsToRefresh.length} account(s)`);
};

  const handleSaveAccount = async (account: Account) => {
    if (editingAccount) {
      await storage.updateAccount(account);
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
    } else {
      // Pour un nouveau compte, récupérer automatiquement les données de l'API Riot
      addLoadingOperation("Adding new account");
      try {
        const riot = await fetchSummonerData(account.summonerName, account.region);

        const soloTier = normalizeTier(riot.soloRankTier);
        const soloDiv = normalizeDivision(riot.soloRankDivision);
        const flexTier = normalizeTier(riot.flexRankTier);
        const flexDiv = normalizeDivision(riot.flexRankDivision);

        const updatedAccount: Account = {
          ...account,
          summonerName: riot.summonerName,
          iconUrl: riot.iconUrl,
          rankTier: soloTier,
          rankDivision: soloDiv,
          gamesCount: riot.soloGamesCount,
          leaguePoints: riot.soloLeaguePoints,
          flexRankTier: flexTier,
          flexRankDivision: flexDiv,
          flexGamesCount: riot.flexGamesCount,
          flexLeaguePoints: riot.flexLeaguePoints,
          updatedAt: new Date().toISOString(),
        };

        await storage.addAccount(updatedAccount);
        toast({
          title: "Success",
          description: "Account added and synced with Riot API",
        });
      } catch (error) {
        // Si l'API échoue, sauvegarder quand même le compte avec les données fournies
        console.error("Failed to sync with Riot API:", error);
        await storage.addAccount(account);
        toast({
          title: "Account added",
          description: "Unable to sync with Riot API. You can refresh the account later.",
          variant: "destructive",
        });
      } finally {
        removeLoadingOperation("Adding new account");
      }
    }
    await loadAccounts();
    setEditingAccount(undefined);
  };

  const handleEditAccount = useCallback((account: Account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  }, []);

  const handleDeleteAccount = useCallback((id: string) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = async () => {
    if (accountToDelete) {
      await storage.deleteAccount(accountToDelete);
      await loadAccounts();
      toast({
        title: "Deleted",
        description: "Account deleted successfully",
      });
    }
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const handleAddNew = useCallback(() => {
    setEditingAccount(undefined);
    setDialogOpen(true);
  }, []);

  // Debounce storage save during drag to prevent main thread blocking
  const saveAccountsDebounced = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (accounts: Account[]) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          storage.saveAccounts(accounts);
        }, 500); // Save 500ms after last drag movement
      };
    })(),
    []
  );

  const moveAccount = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setAccounts((previous) => {
      const sourceIndex = previous.findIndex((acc) => acc.id === sourceId);
      const targetIndex = previous.findIndex((acc) => acc.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return previous;
      }
      const updated = [...previous];
      const [removed] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, removed);
      saveAccountsDebounced(updated); // Debounced save
      return updated;
    });
  }, [saveAccountsDebounced]);

  const handleLoginAccount = async (account: Account) => {
    const api = window.api;
    if (!api?.loginAccount) {
      toast({
        title: "Desktop API indisponible",
        description: "La fonctionnalité de connexion est inaccessible.",
        variant: "destructive",
      });
      return;
    }

    if (isLeaguePathMissing) {
      toast({
        title: "Chemin League requis",
        description:
          "Merci de renseigner le chemin complet vers RiotClientServices.exe avant de lancer une connexion.",
        variant: "destructive",
      });
      return;
    }

    setLoginStatuses((previous) => ({
      ...previous,
      [account.id]: {
        accountId: account.id,
        step: "renderer-start",
        kind: "info",
        message: "Initialisation de la connexion",
      },
    }));

    try {
      await api.loginAccount({
        accountId: account.id,
        login: account.login,
        password: account.password,
        region: account.region,
      });
    } catch (error) {
      console.error("Failed to trigger account login:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue.";
      setLoginStatuses((previous) => ({
        ...previous,
        [account.id]: {
          accountId: account.id,
          step: "renderer-error",
          kind: "error",
          message,
        },
      }));
      toast({
        title: "Connexion a échouée",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleDragStartAccount = useCallback((account: Account) => {
    setDraggingAccountId(account.id);
  }, []);

  const handleDragEnterAccount = useCallback((account: Account) => {
    if (!draggingAccountId) return;
    moveAccount(draggingAccountId, account.id);
  }, [draggingAccountId]);

  const handleDragEndAccount = useCallback(() => {
    setDraggingAccountId(null);
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    addLoadingOperation(`Refreshing all ${accounts.length} account(s)`);
    try {
      // Force refresh all accounts
      const localAccounts = await storage.getAccounts();
      const accountsToRefresh = [...localAccounts];
      const updatedAccounts = [...localAccounts];

      for (let i = 0; i < accountsToRefresh.length; i++) {
        const acc = accountsToRefresh[i];
        try {
          const riot = await fetchSummonerData(acc.summonerName, acc.region);

          const soloTier = normalizeTier(riot.soloRankTier);
          const soloDiv = normalizeDivision(riot.soloRankDivision);
          const flexTier = normalizeTier(riot.flexRankTier);
          const flexDiv = normalizeDivision(riot.flexRankDivision);

          const updated: Account = {
            ...acc,
            summonerName: riot.summonerName,
            iconUrl: riot.iconUrl,
            rankTier: soloTier,
            rankDivision: soloDiv,
            gamesCount: riot.soloGamesCount,
            leaguePoints: riot.soloLeaguePoints,
            flexRankTier: flexTier,
            flexRankDivision: flexDiv,
            flexGamesCount: riot.flexGamesCount,
            flexLeaguePoints: riot.flexLeaguePoints,
            updatedAt: new Date().toISOString(),
          };

          await storage.updateAccount(updated);
          updatedAccounts[i] = updated;
        } catch (err) {
          console.error(`Failed to refresh ${acc.summonerName}:`, err);
        }
      }

      // Update UI once after all accounts are refreshed
      setAccounts(updatedAccounts);

      toast({
        title: "Comptes mis à jour",
        description: `${accountsToRefresh.length} compte(s) rafraîchi(s) avec succès.`,
      });
    } catch (error) {
      console.error("Failed to refresh accounts:", error);
      toast({
        title: "Erreur de rafraîchissement",
        description: "Impossible de mettre à jour les comptes.",
        variant: "destructive",
      });
    } finally {
      removeLoadingOperation(`Refreshing all ${accounts.length} account(s)`);
      setIsRefreshing(false);
    }
  };

  const handleRefreshAccount = useCallback(async (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return;

    addLoadingOperation(`Refreshing ${account.summonerName}`);
    try {
      const riot = await fetchSummonerData(account.summonerName, account.region);

      const soloTier = normalizeTier(riot.soloRankTier);
      const soloDiv = normalizeDivision(riot.soloRankDivision);
      const flexTier = normalizeTier(riot.flexRankTier);
      const flexDiv = normalizeDivision(riot.flexRankDivision);

      const updated: Account = {
        ...account,
        summonerName: riot.summonerName,
        iconUrl: riot.iconUrl,
        rankTier: soloTier,
        rankDivision: soloDiv,
        gamesCount: riot.soloGamesCount,
        leaguePoints: riot.soloLeaguePoints,
        flexRankTier: flexTier,
        flexRankDivision: flexDiv,
        flexGamesCount: riot.flexGamesCount,
        flexLeaguePoints: riot.flexLeaguePoints,
        updatedAt: new Date().toISOString(),
      };

      await storage.updateAccount(updated);

      // Update the account in the list
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? updated : acc))
      );

      toast({
        title: "Compte mis à jour",
        description: `${account.summonerName} a été rafraîchi avec succès.`,
      });
    } catch (error) {
      console.error(`Failed to refresh ${account.summonerName}:`, error);
      toast({
        title: "Erreur de rafraîchissement",
        description: `Impossible de mettre à jour ${account.summonerName}.`,
        variant: "destructive",
      });
    } finally {
      removeLoadingOperation(`Refreshing ${account.summonerName}`);
    }
  }, [accounts, toast, addLoadingOperation, removeLoadingOperation]);

  const handleToggleAutoAccept = async (nextValue: boolean) => {
    const api = window.api;
    if (!api?.setAutoAcceptEnabled) {
      toast({
        title: "Fonctionnalité indisponible",
        description: "Impossible de modifier l'auto-accept sans l'API desktop.",
        variant: "destructive",
      });
      return;
    }

    setIsTogglingAutoAccept(true);
    try {
      const result = await api.setAutoAcceptEnabled(nextValue);
      setAutoAcceptEnabled(result);
      toast({
        title: "Auto accept",
        description: result
          ? "L'acceptation automatique est activée."
          : "L'acceptation automatique est désactivée.",
      });
    } catch (error) {
      console.error("Failed to toggle auto accept:", error);
      toast({
        title: "Impossible de modifier l'auto accept",
        description:
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors du changement d'état.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingAutoAccept(false);
    }
  };

  const handleQuitApp = async () => {
    const api = window.api;
    if (!api?.quitApp) {
      return;
    }

    await api.quitApp();
  };

  const handleAvailabilityChange = useCallback(async (newStatus: string) => {
    const api = (window as any).api;
    if (!api?.setAvailability) {
      toast({
        title: "Fonctionnalité indisponible",
        description: "La fonctionnalité de changement de statut n'est pas disponible.",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.setAvailability(newStatus);
      setAvailability(newStatus);

      const statusLabels: Record<string, string> = {
        chat: "En ligne",
        away: "Absent",
        offline: "Hors ligne",
        mobile: "Mobile"
      };

      toast({
        title: "Statut modifié",
        description: `Ton statut a été changé en : ${statusLabels[newStatus] || newStatus}`,
      });
    } catch (error) {
      console.error("Failed to set availability:", error);
      toast({
        title: "Échec du changement de statut",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de modifier le statut.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterRank("all");
    setFilterRegion("all");
  }, []);

  const handleSaveWelcomeApiKey = async () => {
    const api = window.api;
    if (!api?.setRiotApiKey) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'API key.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingWelcomeApiKey(true);
    try {
      await api.setRiotApiKey(welcomeApiKey);
      await reloadApiKey();
      setShowWelcomeDialog(false);
      toast({
        title: "Bienvenue !",
        description: "Ta clé API a été configurée avec succès.",
      });
    } catch (error) {
      console.error("Failed to save API key:", error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder l'API key.",
        variant: "destructive",
      });
    } finally {
      setIsSavingWelcomeApiKey(false);
    }
  };

  const handleSkipWelcome = () => {
    setShowWelcomeDialog(false);
    toast({
      title: "Configuration ignorée",
      description: "L'application utilisera la clé API par défaut. Tu peux configurer ta propre clé dans les Paramètres.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={chestIcon}
                alt="LoL Vault"
                className="h-12 w-12"
              />
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-card-foreground">
                  LoL Account Manager
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" title="Activer cette fonctionnalité pour accepter automatiquement les matchs">
                <Checkbox
                  id="auto-accept-header"
                  checked={autoAcceptEnabled}
                  onCheckedChange={(checked) =>
                    handleToggleAutoAccept(Boolean(checked))
                  }
                  disabled={isTogglingAutoAccept}
                />
                <label
                  htmlFor="auto-accept-header"
                  className="text-sm font-medium text-card-foreground cursor-pointer"
                >
                  Auto Accept
                </label>
              </div>
              <div className="flex items-center gap-2">
                {availability === "chat" && <Circle className="h-4 w-4 fill-green-500 text-green-500" />}
                {availability === "away" && <Circle className="h-4 w-4 fill-red-500 text-red-500" />}
                {availability === "offline" && <Circle className="h-4 w-4 fill-gray-500 text-gray-500" />}
                {availability === "mobile" && <Smartphone className="h-4 w-4 text-blue-500" />}
                <Select value={availability} onValueChange={handleAvailabilityChange}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chat">En ligne</SelectItem>
                    <SelectItem value="away">Absent</SelectItem>
                    <SelectItem value="offline">Hors ligne</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                title="Rafraîchir tous les comptes"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="secondary" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="h-6 w-6" />
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleQuitApp}
                title="Quitter l'application"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-card-foreground">Search & Filter</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search summoner name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterRank} onValueChange={setFilterRank}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranks</SelectItem>
                <SelectItem value="Unranked">Unranked</SelectItem>
                <SelectItem value="Iron">Iron</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
                <SelectItem value="Emerald">Emerald</SelectItem>
                <SelectItem value="Diamond">Diamond</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="Grandmaster">Grandmaster</SelectItem>
                <SelectItem value="Challenger">Challenger</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="EUW">EUW</SelectItem>
                <SelectItem value="EUNE">EUNE</SelectItem>
                <SelectItem value="NA">NA</SelectItem>
                <SelectItem value="KR">KR</SelectItem>
                <SelectItem value="BR">BR</SelectItem>
                <SelectItem value="LAN">LAN</SelectItem>
                <SelectItem value="LAS">LAS</SelectItem>
                <SelectItem value="OCE">OCE</SelectItem>
                <SelectItem value="RU">RU</SelectItem>
                <SelectItem value="TR">TR</SelectItem>
                <SelectItem value="JP">JP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {filteredAccounts.length} of {accounts.length} accounts
            </span>
            {(searchQuery || filterRank !== "all" || filterRegion !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Account Grid */}
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {accounts.length === 0 ? "No accounts yet" : "No accounts found"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {accounts.length === 0
                  ? "Add your first League of Legends account to get started"
                  : "Try adjusting your search or filters"}
              </p>
              {accounts.length === 0 && (
                <Button onClick={handleAddNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Account
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-card border border-border divide-y">
            {filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
                onLogin={handleLoginAccount}
                onRefresh={handleRefreshAccount}
                loginState={loginStatuses[account.id]}
                loginDisabled={disableLoginButtons}
                loginDisabledReason={loginDisabledReason}
                draggable
                onDragStart={handleDragStartAccount}
                onDragEnter={handleDragEnterAccount}
                onDragEnd={handleDragEndAccount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Account Dialog */}
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editingAccount}
        onSave={handleSaveAccount}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome Dialog - First Launch */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bienvenue sur LoL Account Manager ! 👋</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                Pour utiliser cette application, tu as besoin d'une <strong>clé API Riot Games</strong>.
              </p>
              <p className="text-sm">
                Tu peux obtenir ta clé gratuitement sur{" "}
                <a
                  href="https://developer.riotgames.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  developer.riotgames.com
                </a>
              </p>
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Deux options :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Development Key</strong> : Gratuite, limites d'appels</li>
                  <li><strong>Production Key</strong> : Demande d'approbation, permanente</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="welcome-api-key" className="text-sm font-medium">
                Clé API Riot (optionnel)
              </label>
              <Input
                id="welcome-api-key"
                type="password"
                placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={welcomeApiKey}
                onChange={(e) => setWelcomeApiKey(e.target.value)}
                disabled={isSavingWelcomeApiKey}
              />
              <p className="text-xs text-muted-foreground">
                Tu peux ignorer cette étape et utiliser la clé par défaut (limites plus basses).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleSkipWelcome}
              disabled={isSavingWelcomeApiKey}
            >
              Ignorer
            </Button>
            <Button
              onClick={handleSaveWelcomeApiKey}
              disabled={isSavingWelcomeApiKey || welcomeApiKey.trim().length === 0}
            >
              {isSavingWelcomeApiKey ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Indicator - Fixed Bottom Right */}
      {loadingOperations.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 max-w-xs z-50">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-card-foreground">
                Loading...
              </span>
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                {loadingOperations.map((op, index) => (
                  <div key={index}>{op}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
