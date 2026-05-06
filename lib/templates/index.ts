import type { DocumentRender } from "./types";
import { renderLegalNotice } from "./legal-notice";
import { renderReplyLegalNotice } from "./reply-legal-notice";
import { renderRentAgreement } from "./rent-agreement-11m";
import { renderConsumerComplaint } from "./consumer-complaint-ncdrc";
import { renderRtiApplication } from "./rti-application";
import { LegalNoticeInput } from "@/lib/skus/legal-notice";
import { ReplyLegalNoticeInput } from "@/lib/skus/reply-legal-notice";
import { RentAgreementInput } from "@/lib/skus/rent-agreement-11m";
import { ConsumerComplaintInput } from "@/lib/skus/consumer-complaint-ncdrc";
import { RtiApplicationInput } from "@/lib/skus/rti-application";

export interface RenderContext {
  reference: string;
  generated_at: string; // ISO timestamp
}

export function renderForSku(
  sku: string,
  input: unknown,
  ctx: RenderContext
): DocumentRender {
  switch (sku) {
    case "legal-notice":
      return renderLegalNotice(LegalNoticeInput.parse(input), ctx);
    case "reply-legal-notice":
      return renderReplyLegalNotice(ReplyLegalNoticeInput.parse(input), ctx);
    case "rent-agreement-11m":
      return renderRentAgreement(RentAgreementInput.parse(input), ctx);
    case "consumer-complaint-ncdrc":
      return renderConsumerComplaint(ConsumerComplaintInput.parse(input), ctx);
    case "rti-application":
      return renderRtiApplication(RtiApplicationInput.parse(input), ctx);
    default:
      throw new Error(`No template for sku=${sku}`);
  }
}

export type { DocumentRender } from "./types";
