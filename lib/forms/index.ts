import type { FormSpec } from "./types";
import { legalNoticeForm } from "./legal-notice";
import { replyLegalNoticeForm } from "./reply-legal-notice";
import { rentAgreementForm } from "./rent-agreement-11m";
import { consumerComplaintForm } from "./consumer-complaint-ncdrc";
import { rtiApplicationForm } from "./rti-application";

const FORMS: Record<string, FormSpec> = {
  "legal-notice": legalNoticeForm,
  "reply-legal-notice": replyLegalNoticeForm,
  "rent-agreement-11m": rentAgreementForm,
  "consumer-complaint-ncdrc": consumerComplaintForm,
  "rti-application": rtiApplicationForm
};

export function getFormSpec(sku: string): FormSpec | null {
  return FORMS[sku] ?? null;
}

export type { FormSpec };
