// Razorpay Route linked-account creation. Direct fetch against the
// /v2/accounts endpoint; falls back to deterministic mock account ids
// when keys are unset so the lawyer onboarding flow can be exercised
// end-to-end during local development.

const RAZORPAY_API = "https://api.razorpay.com/v2";

export interface LinkedAccountInput {
  email: string;
  phone?: string;
  legal_business_name: string; // BCI advocate license registered name
  contact_name: string;
  business_type?: "individual" | "proprietorship" | "partnership";
  ifsc?: string;
  account_number?: string;
  beneficiary_name?: string;
}

export interface LinkedAccount {
  id: string;
  status: "created" | "activated" | "needs_clarification" | "suspended";
}

export async function createLinkedAccount(input: LinkedAccountInput): Promise<LinkedAccount> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      id: `acc_mock_${Buffer.from(input.email).toString("hex").slice(0, 12)}`,
      status: "created"
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/accounts`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      phone: input.phone,
      type: "route",
      legal_business_name: input.legal_business_name,
      business_type: input.business_type ?? "individual",
      contact_name: input.contact_name,
      ...(input.ifsc && input.account_number
        ? {
            settlements: {
              account_number: input.account_number,
              ifsc_code: input.ifsc,
              beneficiary_name: input.beneficiary_name ?? input.contact_name
            }
          }
        : {})
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `razorpay accounts.create ${res.status}: ${text.slice(0, 400)}`
    );
  }
  const data = (await res.json()) as { id: string; status?: string };
  return {
    id: data.id,
    status: (data.status as LinkedAccount["status"]) ?? "created"
  };
}
