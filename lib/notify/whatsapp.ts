// AiSensy WhatsApp sender. Falls back to a console-only mock when
// AISENSY_API_KEY is unset.

const AISENSY_API = "https://backend.aisensy.com/campaign/t1/api/v2";

export async function sendWhatsAppDocument(args: {
  to_phone: string; // E.164
  campaign_name: string;
  user_name: string;
  template_params?: string[];
  media_url?: string;
}): Promise<{ ok: boolean; provider: "aisensy" | "mock" }> {
  const key = process.env.AISENSY_API_KEY;
  if (!key) {
    console.warn("[notify/whatsapp] mock send", args);
    return { ok: true, provider: "mock" };
  }

  const res = await fetch(AISENSY_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      apiKey: key,
      campaignName: args.campaign_name,
      destination: args.to_phone,
      userName: args.user_name,
      templateParams: args.template_params ?? [],
      ...(args.media_url
        ? { media: { url: args.media_url, filename: "document.pdf" } }
        : {})
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[notify/whatsapp] aisensy failed", res.status, text.slice(0, 300));
    return { ok: false, provider: "aisensy" };
  }
  return { ok: true, provider: "aisensy" };
}
