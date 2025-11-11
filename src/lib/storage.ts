import { Account } from "@/types/account";

const STORAGE_KEY = "lol_accounts";

export const storage = {
  getAccounts: (): Account[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  },

  saveAccounts: (accounts: Account[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  addAccount: (account: Account): void => {
    const accounts = storage.getAccounts();
    accounts.push(account);
    storage.saveAccounts(accounts);
  },

  updateAccount: (updatedAccount: Account): void => {
    const accounts = storage.getAccounts();
    const index = accounts.findIndex((a) => a.id === updatedAccount.id);
    if (index !== -1) {
      accounts[index] = updatedAccount;
      storage.saveAccounts(accounts);
    }
  },

  deleteAccount: (id: string): void => {
    const accounts = storage.getAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    storage.saveAccounts(filtered);
  },
};
