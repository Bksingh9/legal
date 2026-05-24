import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// API key scopes. Keep these stable — they're part of the public contract.
export const API_SCOPES = ["documents:generate", "notices:bulk"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export interface GeneratedKey {
  token: string; // shown to the caller exactly once
  prefix: string; // stored in clear for display, e.g. "ldk_live_a1b2c3"
  hash: string; // sha256(token), hex — stored at rest
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function base36(bytes: Buffer): string {
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

// Mints a new token. Format: ldk_live_<6-char prefix>_<32-char secret>.
// Only the sha256 hash + the "ldk_live_<prefix>" portion are persisted.
export function generateApiKey(): GeneratedKey {
  const prefixPart = base36(randomBytes(6));
  const secretPart = base36(randomBytes(32));
  const prefix = `ldk_live_${prefixPart}`;
  const token = `${prefix}_${secretPart}`;
  return { token, prefix, hash: sha256Hex(token) };
}

// Constant-time compare of two hex digests of equal length.
export function hashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Pulls the bearer token from Authorization: Bearer <token> or the
// x-api-key header.
export function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  const x = req.headers.get("x-api-key");
  return x?.trim() || null;
}
