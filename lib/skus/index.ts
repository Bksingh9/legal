import { meta as legalNotice } from "./legal-notice";
import { meta as replyLegalNotice } from "./reply-legal-notice";
import { meta as rentAgreement } from "./rent-agreement-11m";
import { meta as consumerComplaint } from "./consumer-complaint-ncdrc";
import { meta as rtiApplication } from "./rti-application";
import { meta as chequeBounceS138 } from "./cheque-bounce-s138";
import { meta as employmentNda } from "./employment-nda";
import type { SkuMeta } from "./types";

const all: readonly SkuMeta[] = [
  legalNotice,
  replyLegalNotice,
  rentAgreement,
  consumerComplaint,
  rtiApplication,
  chequeBounceS138,
  employmentNda
];

export const SKU_REGISTRY: Record<string, SkuMeta> = Object.fromEntries(
  all.map((m) => [m.id, m])
);

export const SKU_IDS = all.map((m) => m.id);

export function getSkuMeta(id: string): SkuMeta | null {
  return SKU_REGISTRY[id] ?? null;
}

export function listSkus(): SkuMeta[] {
  return all.slice();
}

export type { SkuMeta };
export { LAWYER_REVIEW_ADDON_PAISE } from "./types";
