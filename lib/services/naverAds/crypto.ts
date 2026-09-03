import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Encrypts the Naver SearchAd SECRET_KEY at rest (AES-256-GCM). We derive the key from
// JWT_SECRET by default so no extra required env var is needed to run the app (matches
// this project's "zero-cost local/dev" setup) — set ADS_ENCRYPTION_KEY explicitly in
// production so rotating JWT_SECRET (which invalidates login sessions) doesn't also
// silently break stored ad credentials.
function getKey(): Buffer {
  const secret = process.env.ADS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("ADS_ENCRYPTION_KEY 또는 JWT_SECRET 환경변수가 설정되지 않았습니다.");
  return scryptSync(secret, "naver-ads-secret-key-v1", 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("저장된 SECRET_KEY 형식이 올바르지 않습니다.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
