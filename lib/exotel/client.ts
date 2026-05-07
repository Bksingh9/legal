// Exotel masked-number outbound dial. Real call hits the Exotel SID's
// /Calls/connect endpoint; mock fallback returns a deterministic call SID
// so the post-payment hand-off can be exercised locally.

export const EXOTEL_ENABLED =
  !!process.env.EXOTEL_SID &&
  !!process.env.EXOTEL_API_KEY &&
  !!process.env.EXOTEL_API_TOKEN &&
  !!process.env.EXOTEL_VIRTUAL_NUMBER;

export interface ConnectInput {
  from_phone: string; // user (E.164)
  to_phone: string; // lawyer (E.164)
  caller_id?: string; // virtual masked number; defaults to env
  record?: boolean;
}

export interface ConnectResult {
  call_sid: string;
  status: "queued" | "connected" | "failed";
}

export async function connectMaskedCall(input: ConnectInput): Promise<ConnectResult> {
  const sid = process.env.EXOTEL_SID;
  const key = process.env.EXOTEL_API_KEY;
  const token = process.env.EXOTEL_API_TOKEN;
  const virtual = input.caller_id ?? process.env.EXOTEL_VIRTUAL_NUMBER;

  if (!sid || !key || !token || !virtual) {
    return {
      call_sid: `exotel_mock_${Buffer.from(input.from_phone + input.to_phone).toString("hex").slice(0, 14)}`,
      status: "queued"
    };
  }

  const auth = Buffer.from(`${key}:${token}`).toString("base64");
  const params = new URLSearchParams({
    From: input.from_phone,
    To: input.to_phone,
    CallerId: virtual,
    Record: input.record ? "true" : "false"
  });

  const res = await fetch(
    `https://api.exotel.com/v1/Accounts/${sid}/Calls/connect.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: params
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exotel connect ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { Call?: { Sid?: string; Status?: string } };
  const callSid = data.Call?.Sid;
  if (!callSid) throw new Error("exotel: missing Call.Sid in response");
  return {
    call_sid: callSid,
    status: data.Call?.Status === "in-progress" ? "connected" : "queued"
  };
}
