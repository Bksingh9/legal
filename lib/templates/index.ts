import type { DocumentRender } from "./types";
import { renderLegalNotice } from "./legal-notice";
import { renderReplyLegalNotice } from "./reply-legal-notice";
import { renderRentAgreement } from "./rent-agreement-11m";
import { renderConsumerComplaint } from "./consumer-complaint-ncdrc";
import { renderRtiApplication } from "./rti-application";
import { renderChequeBounceS138 } from "./cheque-bounce-s138";
import { renderEmploymentNda } from "./employment-nda";
import { LegalNoticeInput } from "@/lib/skus/legal-notice";
import { ReplyLegalNoticeInput } from "@/lib/skus/reply-legal-notice";
import { RentAgreementInput } from "@/lib/skus/rent-agreement-11m";
import { ConsumerComplaintInput } from "@/lib/skus/consumer-complaint-ncdrc";
import { RtiApplicationInput } from "@/lib/skus/rti-application";
import { ChequeBounceS138Input } from "@/lib/skus/cheque-bounce-s138";
import { EmploymentNdaInput } from "@/lib/skus/employment-nda";

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
    case "cheque-bounce-s138":
      return renderChequeBounceS138(ChequeBounceS138Input.parse(input), ctx);
    case "employment-nda":
      return renderEmploymentNda(EmploymentNdaInput.parse(input), ctx);
    default:
      throw new Error(`No template for sku=${sku}`);
  }
}

export type { DocumentRender } from "./types";
