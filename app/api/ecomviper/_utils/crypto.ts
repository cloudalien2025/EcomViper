import crypto from "crypto";

interface CipherPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

function parseEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const key = Buffer.from(trimmed, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes (base64 or hex)");
  }
  return key;
}

function resolveEncryptionKeys(): Buffer[] {
  const rawKeys = [process.env.INTEGRATIONS_ENCRYPTION_KEY, process.env.SERVER_ENCRYPTION_KEY]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim());

  if (rawKeys.length === 0) {
    throw new Error("INTEGRATIONS_ENCRYPTION_KEY not configured");
  }

  const uniqueRawKeys = Array.from(new Set(rawKeys));
  return uniqueRawKeys.map(parseEncryptionKey);
}

export function encryptSecret(plaintext: string, context?: string): string {
  const [key] = resolveEncryptionKeys();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  if (context) {
    cipher.setAAD(Buffer.from(context, "utf8"));
  }

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: CipherPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decryptSecret(payloadB64: string, context?: string): string {
  const payloadJson = Buffer.from(payloadB64, "base64").toString("utf8");
  const payload = JSON.parse(payloadJson) as CipherPayload;

  let lastError: Error | null = null;
  for (const key of resolveEncryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(payload.iv, "base64")
      );

      if (context) {
        decipher.setAAD(Buffer.from(context, "utf8"));
      }
      decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, "base64")),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to decrypt integration secret");
    }
  }

  throw lastError ?? new Error("Failed to decrypt integration secret");
}

export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
