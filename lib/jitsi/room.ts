// Deterministic Jitsi public meet room URL per consultation. Zero-key,
// browser-native A/V at Tier-0; both parties open the same URL and meet.
//
// The URL embeds the consultation id; Jitsi rooms are namespaced by the
// path segment alone, so as long as the URL stays private (we only show
// it inside the consent-gated /api/consultations/[id]/start response and
// the corresponding /consultations/[id] waiting room), the room is
// effectively access-controlled.

const JITSI_BASE = "https://meet.jit.si";

export function roomUrlFor(consultationId: string): string {
  const safe = consultationId.replace(/[^A-Za-z0-9-]/g, "");
  return `${JITSI_BASE}/legaldesk-${safe}`;
}
