import { useState, useEffect } from "react";
import { Account, RankTier, Region } from "@/types/account";
import { storage } from "@/lib/storage";
import { AccountCard } from "@/components/AccountCard";
import { AccountDialog } from "@/components/AccountDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRank, setFilterRank] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [accounts, searchQuery, filterRank, filterRegion]);

  const loadAccounts = () => {
    const loadedAccounts = storage.getAccounts();
    setAccounts(loadedAccounts);
  };

  const applyFilters = () => {
    let filtered = [...accounts];

    if (searchQuery) {
      filtered = filtered.filter(
        (acc) =>
          acc.summonerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.accountName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterRank !== "all") {
      filtered = filtered.filter((acc) => acc.rankTier === filterRank);
    }

    if (filterRegion !== "all") {
      filtered = filtered.filter((acc) => acc.region === filterRegion);
    }

    setFilteredAccounts(filtered);
  };

  const handleSaveAccount = (account: Account) => {
    if (editingAccount) {
      storage.updateAccount(account);
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
    } else {
      storage.addAccount(account);
      toast({
        title: "Success",
        description: "Account added successfully",
      });
    }
    loadAccounts();
    setEditingAccount(undefined);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDeleteAccount = (id: string) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      storage.deleteAccount(accountToDelete);
      loadAccounts();
      toast({
        title: "Deleted",
        description: "Account deleted successfully",
      });
    }
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const handleAddNew = () => {
    setEditingAccount(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground">LoL Account Manager</h1>
              <p className="text-muted-foreground mt-1">
                Manage your League of Legends accounts
              </p>
            </div>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                onClick={() => {
                  setSearchQuery("");
                  setFilterRank("all");
                  setFilterRegion("all");
                }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEditAccount}
                onDelete={handleDeleteAccount}
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
    </div>
  );
};

export default Index;
