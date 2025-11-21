/**
 * Migration script to encrypt existing unencrypted accounts
 * Run this once on first load with encryption enabled
 */

const STORAGE_KEY = "lol_accounts";
const MIGRATION_FLAG = "lol_accounts_encrypted";

export async function migrateToEncryptedStorage(): Promise<void> {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_FLAG) === "true") {
    return; // Already migrated
  }

  const api = (window as any).api;
  if (!api?.encryptAccount) {
    console.warn("Encryption API not available, skipping migration");
    return;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      // No accounts to migrate
      localStorage.setItem(MIGRATION_FLAG, "true");
      return;
    }

    const accounts = JSON.parse(data);

    console.log(`Migrating ${accounts.length} accounts to encrypted storage...`);

    // Encrypt all accounts
    const encryptedAccounts = await Promise.all(
      accounts.map(async (acc: any) => {
        // Check if already encrypted (has colon separator format)
        const isEncrypted =
          acc.login?.includes(":") && acc.password?.includes(":");

        if (isEncrypted) {
          return acc; // Already encrypted
        }

        // Encrypt this account
        return await api.encryptAccount(acc);
      })
    );

    // Save encrypted accounts
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedAccounts));
    localStorage.setItem(MIGRATION_FLAG, "true");

    console.log("Migration to encrypted storage completed successfully");
  } catch (error) {
    console.error("Failed to migrate accounts to encrypted storage:", error);
    throw error;
  }
}