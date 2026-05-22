"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "./input";

type State = "idle" | "loading" | "success" | "not_found" | "error";

type Props = {
  /** Current PIN value. */
  value: string;
  onChange: (v: string) => void;
  /** Fired with the resolved city + state when the API returns a match. */
  onResolve?: (resolved: { city: string; state: string }) => void;
  /** Optional label override. */
  label?: string;
  /** Pre-existing free-text city (shown when no lookup has succeeded yet). */
  fallbackCity?: string;
  required?: boolean;
  disabled?: boolean;
};

const PIN_RE = /^[1-9][0-9]{5}$/;

export function PincodeField({
  value,
  onChange,
  onResolve,
  label = "PIN code",
  fallbackCity,
  required,
  disabled
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [resolved, setResolved] = useState<{ city: string; state: string } | null>(null);

  useEffect(() => {
    if (!PIN_RE.test(value)) {
      setState("idle");
      setResolved(null);
      return;
    }
    let cancelled = false;
    setState("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookups/pincode?code=${value}`);
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
        const body = (await res.json()) as { city: string; state: string };
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
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="6-digit PIN"
          autoComplete="postal-code"
          required={required}
          disabled={disabled}
          aria-describedby="pincode-status"
          className="pr-9"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {state === "loading" ? (
            <Loader2 size={16} className="animate-spin text-ink-400" />
          ) : state === "success" ? (
            <CheckCircle2 size={16} className="text-green-600" />
          ) : state === "not_found" || state === "error" ? (
            <AlertCircle size={16} className="text-amber-500" />
          ) : (
            <MapPin size={16} className="text-ink-200" />
          )}
        </span>
      </div>
      <span id="pincode-status" className="text-xs text-ink-400" aria-live="polite">
        {state === "success" && resolved ? (
          <span className="text-ink-700">
            {resolved.city}, {resolved.state}
          </span>
        ) : state === "not_found" ? (
          "We couldn't find that PIN. Double-check it."
        ) : state === "error" ? (
          "Lookup failed. You can enter your city manually below."
        ) : state === "loading" ? (
          "Looking up…"
        ) : fallbackCity ? (
          `Current: ${fallbackCity}`
        ) : (
          "We'll auto-fill your city and state."
        )}
      </span>
    </label>
  );
}
