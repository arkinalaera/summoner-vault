const crypto = require("crypto");
const os = require("os");
const { machineIdSync } = require("node-machine-id");

// Algorithm for encryption
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Cache for the encryption key to avoid regenerating it every time
let cachedKey = null;

/**
 * Generate a deterministic encryption key based on machine ID
 * This ensures the same key is used on the same machine
 */
function getEncryptionKey() {
  // Return cached key if available
  if (cachedKey) {
    return cachedKey;
  }

  try {
    // Get unique machine ID
    const machineId = machineIdSync();

    // Add hostname and platform as salt
    const salt = `${os.hostname()}-${os.platform()}-${machineId}`;

    // Derive a 256-bit key using PBKDF2
    const key = crypto.pbkdf2Sync(
      salt,
      "lol-account-manager-salt-v1", // Static salt
      100000, // Iterations
      KEY_LENGTH,
      "sha256"
    );

    // Cache the key for future use
    cachedKey = key;

    return key;
  } catch (error) {
    console.error("Failed to generate encryption key:", error);
    throw error;
  }
}

/**
 * Encrypt a string
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted text in format: iv:authTag:encryptedData (all base64)
 */
function encrypt(text) {
  if (!text || typeof text !== "string") {
    return text; // Return as-is if not a string
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw error;
  }
}

/**
 * Decrypt a string
 * @param {string} encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== "string") {
    return encryptedText; // Return as-is if not a string
  }

  // Check if it's encrypted (contains colons)
  if (!encryptedText.includes(":")) {
    // Not encrypted, return as-is (backward compatibility)
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivBase64, authTagBase64, encryptedData] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return original text if decryption fails (backward compatibility)
    return encryptedText;
  }
}

/**
 * Encrypt an account object (only sensitive fields)
 * @param {object} account - Account object
 * @returns {object} - Account with encrypted sensitive fields
 */
function encryptAccount(account) {
  if (!account) return account;

  return {
    ...account,
    login: account.login ? encrypt(account.login) : account.login,
    password: account.password ? encrypt(account.password) : account.password,
  };
}

/**
 * Decrypt an account object (only sensitive fields)
 * @param {object} account - Account object with encrypted fields
 * @returns {object} - Account with decrypted sensitive fields
 */
function decryptAccount(account) {
  if (!account) return account;

  return {
    ...account,
    login: account.login ? decrypt(account.login) : account.login,
    password: account.password ? decrypt(account.password) : account.password,
  };
}

module.exports = {
  encrypt,
  decrypt,
  encryptAccount,
  decryptAccount,
};
