// Resend email sender. Falls back to a console-only mock when
// RESEND_API_KEY is unset so the post-payment delivery flow can be
// exercised end-to-end during local development.

const RESEND_API = "https://api.resend.com/emails";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; provider: "resend" | "mock"; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "hello@legaldesk.ai";

  if (!key) {
    console.warn("[notify/email] mock send", {
      to: args.to,
      subject: args.subject,
      attachments: args.attachments?.map((a) => `${a.filename}:${a.content.byteLength}b`)
    });
    return { ok: true, provider: "mock" };
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      attachments: args.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64")
      }))
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[notify/email] resend failed", res.status, text.slice(0, 300));
    return { ok: false, provider: "resend" };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, provider: "resend", id: data.id };
}
