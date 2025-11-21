import { Account } from "@/types/account";

const STORAGE_KEY = "lol_accounts";

/**
 * Decrypt accounts when reading from storage
 */
async function decryptAccounts(accounts: Account[]): Promise<Account[]> {
  const api = (window as any).api;
  if (!api?.decryptAccount) {
    return accounts; // No encryption available
  }

  try {
    const decrypted = await Promise.all(
      accounts.map((acc) => api.decryptAccount(acc))
    );
    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt accounts:", error);
    return accounts; // Return original on error
  }
}

/**
 * Encrypt accounts before saving to storage
 */
async function encryptAccounts(accounts: Account[]): Promise<Account[]> {
  const api = (window as any).api;
  if (!api?.encryptAccount) {
    return accounts; // No encryption available
  }

  try {
    const encrypted = await Promise.all(
      accounts.map((acc) => api.encryptAccount(acc))
    );
    return encrypted;
  } catch (error) {
    console.error("Failed to encrypt accounts:", error);
    return accounts; // Return original on error
  }
}

export const storage = {
  getAccounts: async (): Promise<Account[]> => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const accounts = data ? JSON.parse(data) : [];

      // Decrypt accounts before returning
      return await decryptAccounts(accounts);
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  },

  saveAccounts: async (accounts: Account[]): Promise<void> => {
    try {
      // Encrypt accounts before saving
      const encrypted = await encryptAccounts(accounts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  addAccount: async (account: Account): Promise<void> => {
    const accounts = await storage.getAccounts();
    accounts.push(account);
    await storage.saveAccounts(accounts);
  },

  updateAccount: async (updatedAccount: Account): Promise<void> => {
    const accounts = await storage.getAccounts();
    const index = accounts.findIndex((a) => a.id === updatedAccount.id);
    if (index !== -1) {
      accounts[index] = updatedAccount;
      await storage.saveAccounts(accounts);
    }
  },

  deleteAccount: async (id: string): Promise<void> => {
    const accounts = await storage.getAccounts();
    const filtered = accounts.filter((a) => a.id !== id);
    await storage.saveAccounts(filtered);
  },
};
