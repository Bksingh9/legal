import { NextResponse } from "next/server";
import { buildOpenApi } from "@/lib/openapi/spec";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 300;

// OpenAPI 3 spec for the LegalDesk public + admin API.
// Served at /api/openapi; rendered by /api/docs via RapiDoc (CDN-loaded
// HTML — no extra npm dep). The spec is built from the same zod schemas
// the runtime uses so it stays in sync.
export async function GET() {
  const spec = buildOpenApi();
  return NextResponse.json(spec, {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}
