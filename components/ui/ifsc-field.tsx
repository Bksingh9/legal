"use client";

import { useEffect, useState } from "react";
import { Loader2, Landmark, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "./input";

type Resolved = { bank: string; branch: string; city: string; state: string };
type State = "idle" | "loading" | "success" | "not_found" | "error";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onResolve?: (resolved: Resolved) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function IfscField({
  value,
  onChange,
  onResolve,
  label = "IFSC",
  required,
  disabled
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    const normalized = value.toUpperCase();
    if (!IFSC_RE.test(normalized)) {
      setState("idle");
      setResolved(null);
      return;
    }
    let cancelled = false;
    setState("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookups/ifsc?code=${normalized}`);
        if (cancelled) return;
        if (res.status === 404) {
          setState("not_found");
          setResolved(null);
          return;
        }
        if (!res.ok) {
          setState("error");
          setResolved(null);
          return;
        }
        const body = (await res.json()) as Resolved;
        if (cancelled) return;
        setResolved(body);
        setState("success");
        onResolve?.(body);
      } catch {
        if (!cancelled) {
          setState("error");
          setResolved(null);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, onResolve]);

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().slice(0, 11))}
          placeholder="HDFC0001234"
          maxLength={11}
          required={required}
          disabled={disabled}
          className="pr-9 font-mono uppercase tracking-wider"
          aria-describedby="ifsc-status"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {state === "loading" ? (
            <Loader2 size={16} className="animate-spin text-ink-400" />
          ) : state === "success" ? (
            <CheckCircle2 size={16} className="text-green-600" />
          ) : state === "not_found" || state === "error" ? (
            <AlertCircle size={16} className="text-amber-500" />
          ) : (
            <Landmark size={16} className="text-ink-200" />
          )}
        </span>
      </div>
      <span id="ifsc-status" className="text-xs text-ink-400" aria-live="polite">
        {state === "success" && resolved ? (
          <span className="text-ink-700">
            {resolved.bank} · {resolved.branch}, {resolved.city}
          </span>
        ) : state === "not_found" ? (
          "We couldn't find that IFSC. Double-check it."
        ) : state === "error" ? (
          "Lookup failed. Keep your IFSC — we'll validate it later."
        ) : state === "loading" ? (
          "Looking up…"
        ) : (
          "11-character code from your cheque or bank app."
        )}
      </span>
    </label>
  );
}
