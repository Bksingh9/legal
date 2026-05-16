// UPI deep-link builder. Zero-key. Opens any UPI app on the device
// (GPay, PhonePe, Paytm, BHIM) prefilled with the merchant VPA, name,
// amount and transaction note. The user completes the transfer in
// their UPI app and returns to the platform with a 12-digit UTR.
//
// Spec: https://www.npci.org.in/PDF/npci/upi/UPI-Linking-Specs.pdf
// Schema: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tn=<note>&tr=<ref>&cu=INR

export interface UpiDeepLinkArgs {
  vpa: string;            // your merchant VPA, e.g. "legaldesk@upi"
  merchantName: string;   // display name shown in the UPI app
  amountInr: number;      // in rupees, two decimals max
  txNote: string;         // short description; UPI limits ~50 chars
  txRef: string;          // your internal idempotency / reconciliation key
}

export function buildUpiDeepLink(args: UpiDeepLinkArgs): string {
  const params = new URLSearchParams();
  params.set("pa", args.vpa);
  params.set("pn", args.merchantName);
  params.set("am", args.amountInr.toFixed(2));
  params.set("tn", args.txNote.slice(0, 50));
  params.set("tr", args.txRef.slice(0, 35));
  params.set("cu", "INR");
  return `upi://pay?${params.toString()}`;
}

// 12-digit UPI Unique Transaction Reference. Validation per NPCI: 12
// digits, all numeric. Some banks return longer alphanumeric IDs for
// non-UPI flows; we accept those leniently up to 22 chars too.
const UTR_RX = /^[A-Za-z0-9]{12,22}$/;
export function isValidUtr(s: string): boolean {
  return UTR_RX.test(s.trim());
}

export function isUpiConfigured(): boolean {
  return Boolean(process.env.UPI_VPA && process.env.UPI_MERCHANT_NAME);
}

export function getUpiConfig(): { vpa: string; merchantName: string } | null {
  const vpa = process.env.UPI_VPA;
  const merchantName = process.env.UPI_MERCHANT_NAME;
  if (!vpa || !merchantName) return null;
  return { vpa, merchantName };
}
