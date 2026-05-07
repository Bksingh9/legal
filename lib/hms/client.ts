import { createHmac } from "node:crypto";

// 100ms (hms) room creation + auth-token signing. Real call hits
// api.100ms.live/v2; mock fallback returns deterministic ids so the
// post-payment join hand-off can be exercised locally without keys.

const HMS_API = "https://api.100ms.live/v2";

export const HMS_ENABLED =
  !!process.env.HMS_ACCESS_KEY &&
  !!process.env.HMS_SECRET &&
  !!process.env.HMS_TEMPLATE_ID;

interface ManagementToken {
  token: string;
  expires_at: number;
}

let cachedManagement: ManagementToken | null = null;

function signManagementToken(accessKey: string, secret: string): ManagementToken {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 60 * 60 * 23; // 23h
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      access_key: accessKey,
      type: "management",
      version: 2,
      iat: issuedAt,
      nbf: issuedAt,
      exp: expiresAt,
      jti: cryptoRandom()
    })
  );
  const sig = b64url(
    createHmac("sha256", secret).update(`${header}.${payload}`).digest()
  );
  return { token: `${header}.${payload}.${sig}`, expires_at: expiresAt };
}

function getManagementToken(): ManagementToken | null {
  const accessKey = process.env.HMS_ACCESS_KEY;
  const secret = process.env.HMS_SECRET;
  if (!accessKey || !secret) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedManagement && cachedManagement.expires_at - 60 > now) return cachedManagement;
  cachedManagement = signManagementToken(accessKey, secret);
  return cachedManagement;
}

export interface CreateRoomInput {
  name: string; // typically `consult-<consultation_id>`
  description?: string;
  recording?: boolean;
}

export interface RoomResult {
  room_id: string;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomResult> {
  const accessKey = process.env.HMS_ACCESS_KEY;
  const templateId = process.env.HMS_TEMPLATE_ID;
  if (!accessKey || !templateId) {
    return {
      room_id: `room_mock_${Buffer.from(input.name).toString("hex").slice(0, 14)}`
    };
  }
  const mgmt = getManagementToken();
  if (!mgmt) throw new Error("hms: management token unavailable");

  const res = await fetch(`${HMS_API}/rooms`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${mgmt.token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      name: input.name.toLowerCase(),
      description: input.description,
      template_id: templateId,
      recording_info: input.recording
        ? { enabled: true, upload_info: { type: "s3" } }
        : undefined
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`hms create room ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("hms: missing room id");
  return { room_id: data.id };
}

// Per-user auth token. Browser SDK uses this to join a room.
export function signRoomAuthToken(args: {
  user_id: string;
  room_id: string;
  role: "host" | "guest" | "viewer";
}): string {
  const accessKey = process.env.HMS_ACCESS_KEY;
  const secret = process.env.HMS_SECRET;
  if (!accessKey || !secret) {
    return `auth_mock_${args.room_id}_${args.role}`;
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 60 * 60 * 6; // 6h join window
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      access_key: accessKey,
      room_id: args.room_id,
      user_id: args.user_id,
      role: args.role,
      type: "app",
      version: 2,
      iat: issuedAt,
      nbf: issuedAt,
      exp: expiresAt,
      jti: cryptoRandom()
    })
  );
  const sig = b64url(
    createHmac("sha256", secret).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${sig}`;
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function cryptoRandom(): string {
  return [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
