// OpenAPI 3.0 spec for the LegalDesk public + admin API surface.
// Hand-rolled (not auto-derived) so the published contract is the
// source of truth, not implementation incidentals.
//
// Pulls SKU schemas from lib/skus + consult pack pricing for the
// well-known structures; everything else is listed inline.

import { listSkus } from "@/lib/skus";
import { CONSULT_PACKS } from "@/lib/consult/packs";

export function buildOpenApi() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://legaldesk-ai.vercel.app";

  return {
    openapi: "3.0.3",
    info: {
      title: "LegalDesk AI API",
      version: "1.0.0",
      description:
        "Public + admin API surface for the LegalDesk AI platform. The Tier-0 contract holds: every paid integration has a graceful zero-key fallback. BCI Rule 36 + DPDP Act 2023 compliant by construction.",
      contact: { email: "hello@legaldesk.ai", url: `${siteUrl}/grievance` },
      license: {
        name: "Source-available — see repo for terms"
      }
    },
    servers: [{ url: siteUrl, description: "Production" }],
    tags: [
      { name: "triage", description: "AI legal triage and case-prep generation" },
      { name: "documents", description: "Document automation SKUs" },
      { name: "consultations", description: "Tier-3 lawyer consultations" },
      { name: "lawyer", description: "Lawyer onboarding + offer queue" },
      { name: "payments", description: "Razorpay + UPI deep-link" },
      { name: "leads", description: "Cold lead intake (Vakilsearch-pattern)" },
      { name: "notifications", description: "In-app inbox + Web Push" },
      { name: "dpdp", description: "DPDP Act 2023 data-rights endpoints" },
      { name: "admin", description: "Admin-only (role=admin)" }
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["meta"],
          summary: "Liveness probe + dependency map",
          responses: {
            "200": {
              description: "Always 200; body reports which integrations are wired",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["ok"] },
                      deps: { type: "object", additionalProperties: { type: "boolean" } },
                      llm_routing: { type: "object", additionalProperties: { type: "string" } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/waitlist": op({
        tags: ["leads"],
        summary: "Pre-launch waitlist signup (legacy; new traffic uses /api/consult-leads)",
        body: ["email", "phone?", "source?"],
        responses: { "200": "{ ok, persisted }", "400": "Invalid input" }
      }),
      "/api/consult-leads": op({
        tags: ["leads"],
        summary: "Vakilsearch-pattern fast intake — name + phone + 1-line issue",
        body: ["name*", "phone*", "issue*", "city?", "email?", "marketing_opt_in?"],
        responses: {
          "200": "{ ok, lead_id, callback_eta: '10 minutes' }",
          "400": "Validation failed / captcha failed",
          "429": "Rate limited (20/min/IP)"
        }
      }),
      "/api/triage/classify": op({
        tags: ["triage"],
        summary: "Classify a query into one of 10 spec-§3 categories",
        body: ["raw_text*"],
        responses: { "200": "{ ok, classification, urgency, language }" }
      }),
      "/api/triage/prep": op({
        tags: ["triage"],
        summary: "Generate a 1-page Case Prep (PDF persisted when authenticated)",
        body: ["query_id? OR raw_text*", "classification?", "language?"],
        responses: { "200": "{ ok, disclaimer, prep, prep_pdf_url? }" }
      }),
      "/api/triage/transcribe": op({
        tags: ["triage"],
        summary: "Sarvam STT for Indic voice input. 501 when SARVAM_API_KEY unset.",
        body: ["multipart audio + language"],
        responses: { "200": "{ ok, text, language }", "501": "STT not configured" }
      }),
      ...skuDocumentPaths(),
      "/api/consultations/book": op({
        tags: ["consultations"],
        summary: "Book a Tier-3 consultation — picks top 3 verified lawyers + creates offers",
        body: ["pack*", "channel*", "specialization*", "language*", "state*"],
        responses: {
          "200": "{ ok, consultation_id, matched, order_id, amount_paise }",
          "401": "Sign-in required"
        }
      }),
      "/api/consultations/{id}/consent": op({
        tags: ["consultations"],
        summary: "Record recording-consent for the calling user (both parties required before /start)",
        params: ["id"],
        body: ["consent: boolean"],
        responses: { "200": "{ ok }" }
      }),
      "/api/consultations/{id}/start": op({
        tags: ["consultations"],
        summary: "Start a consultation — returns Jitsi URL (Tier-0) or HMS room (when keys wired)",
        params: ["id"],
        responses: {
          "200":
            "{ ok, channel, provider: 'jitsi'|'hms'|'exotel', jitsi_room_url?|hms_room_id?|exotel_call_sid? }",
          "409": "Both-party consent missing"
        }
      }),
      "/api/consultations/{id}/finish": op({
        tags: ["consultations"],
        summary: "Mark a consultation completed + compute payout split",
        params: ["id"],
        body: ["duration_sec*", "transcript?"],
        responses: { "200": "{ ok, payout_lawyer_paise, summary? }" }
      }),
      "/api/lawyer/apply": op({
        tags: ["lawyer"],
        summary: "Submit a verified-advocate application (public — anon-flow provisions the auth user)",
        body: ["bar_council_id*", "state*", "specializations[]*", "languages[]*", "pan*", "consent*", "payout{}*"],
        responses: { "200": "{ ok, lawyer_id, anon_slug, status: 'pending', check_email }" }
      }),
      "/api/lawyer/offers": op({
        tags: ["lawyer"],
        summary: "List my pending offers",
        responses: { "200": "{ offers[] }" }
      }),
      "/api/lawyer/offers/{id}/accept": op({
        tags: ["lawyer"],
        summary: "Accept an offer (first-come, first-served)",
        params: ["id"],
        responses: { "200": "{ ok, consultation_id, client_whatsapp_link, consultation_link }" }
      }),
      "/api/payments/upi-intent": op({
        tags: ["payments"],
        summary: "Create a UPI deep-link payment intent (zero-key)",
        body: ["document_id? OR consultation_id?", "idempotency_key*"],
        responses: { "200": "{ ok, payment_id, upi_url, amount_paise, tx_ref }" }
      }),
      "/api/payments/upi-confirm": op({
        tags: ["payments"],
        summary: "Submit the 12-22 char UTR after the user pays via UPI",
        body: ["payment_id*", "utr*"],
        responses: { "200": "{ ok }", "409": "Duplicate UTR" }
      }),
      "/api/payments/webhook": op({
        tags: ["payments"],
        summary: "Razorpay HMAC-verified webhook (payment.captured / subscription.* / refund.*)",
        body: ["Razorpay event payload"],
        responses: { "200": "{ ok }", "400": "Invalid signature" }
      }),
      "/api/notifications": op({
        tags: ["notifications"],
        summary: "List my recent inbox notifications",
        responses: { "200": "{ items[] }" }
      }),
      "/api/dpdp/export": op({
        tags: ["dpdp"],
        summary: "DPDP Act §11 export of all data we hold for the calling user",
        responses: { "200": "{ ok, export: { user, queries, documents, payments, ... } }" }
      }),
      "/api/dpdp/erase": op({
        tags: ["dpdp"],
        summary: "DPDP Act §12 erasure — requires literal confirmation phrase",
        body: ['confirm: "DELETE MY ACCOUNT"'],
        responses: { "200": "{ ok, erased }" }
      }),
      "/api/admin/payments/{id}/refund": op({
        tags: ["admin"],
        summary: "Issue a Razorpay refund (admin-only). UPI rows must be refunded out-of-band.",
        params: ["id"],
        body: ["amount_paise?", "reason?"],
        responses: { "200": "{ ok, refund_id, refund_status }", "403": "Not admin", "409": "Wrong method / status" }
      })
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sb-<projectRef>-auth-token",
          description: "Supabase SSR session cookie. Set by /auth/callback after Google / magic-link / password sign-in."
        }
      },
      schemas: {
        ConsultPack: {
          type: "object",
          properties: {
            id: { type: "string", enum: Object.keys(CONSULT_PACKS) },
            duration_min: { type: "integer" },
            price_paise: { type: "integer" },
            title: { type: "string" }
          },
          example: CONSULT_PACKS.p15
        }
      }
    },
    security: [{ cookieAuth: [] }]
  };
}

// Helper to keep path bodies tight.
function op(spec: {
  tags: string[];
  summary: string;
  params?: string[];
  body?: string[];
  responses: Record<string, string | object>;
}): Record<string, unknown> {
  const httpMethod = "post"; // most endpoints in this app are POSTs
  return {
    [httpMethod]: {
      tags: spec.tags,
      summary: spec.summary,
      parameters: spec.params?.map((p) => ({
        name: p,
        in: "path",
        required: true,
        schema: { type: "string" }
      })),
      requestBody: spec.body
        ? {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: spec.body.join(", ")
                }
              }
            }
          }
        : undefined,
      responses: Object.fromEntries(
        Object.entries(spec.responses).map(([code, body]) => [
          code,
          {
            description: typeof body === "string" ? body : "See body",
            content:
              typeof body === "string"
                ? undefined
                : {
                    "application/json": {
                      schema: body as Record<string, unknown>
                    }
                  }
          }
        ])
      )
    }
  };
}

function skuDocumentPaths(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const sku of listSkus()) {
    out[`/api/documents/${sku.id}/preview`] = op({
      tags: ["documents"],
      summary: `Preview the ${sku.title} draft (public, free)`,
      body: ["SKU-specific input (see lib/skus)"],
      responses: { "200": "{ ok, document }" }
    });
    out[`/api/documents/${sku.id}/download`] = op({
      tags: ["documents"],
      summary: `Free download — ${sku.title} as PDF or DOCX`,
      body: ["SKU-specific input + ?format=pdf|docx"],
      responses: { "200": "Binary PDF/DOCX" }
    });
  }
  return out;
}
