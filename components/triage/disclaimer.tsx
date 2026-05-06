import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";

export function Disclaimer() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      {TRIAGE_DISCLAIMER}
    </p>
  );
}
