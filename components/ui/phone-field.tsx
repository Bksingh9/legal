"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "./input";

type Country = { name: string; code: string; dial: string; flag: string };

type Props = {
  /** The composed E.164-ish value `${dial}${national}`, emitted to the parent. */
  value: string;
  onChange: (v: string) => void;
  label?: string;
  defaultDial?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  placeholder?: string;
};

const FALLBACK_COUNTRIES: Country[] = [
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳" },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧" },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪" },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬" }
];

// Module-level cache so we only fetch the country list once per session.
let cache: Country[] | null = null;

function splitValue(value: string, countries: Country[]): { dial: string; national: string } {
  if (!value) return { dial: "+91", national: "" };
  // Find the longest dial code that the value starts with.
  const sorted = [...countries].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (value.startsWith(c.dial)) {
      return { dial: c.dial, national: value.slice(c.dial.length).trim() };
    }
  }
  return { dial: "+91", national: value.replace(/^\+\d+\s*/, "") };
}

export function PhoneField({
  value,
  onChange,
  label = "Phone",
  defaultDial = "+91",
  required,
  disabled,
  autoComplete = "tel",
  placeholder = "98765 43210"
}: Props) {
  const [countries, setCountries] = useState<Country[]>(cache ?? FALLBACK_COUNTRIES);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    fetch("/api/lookups/countries")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled || !Array.isArray(body) || body.length === 0) return;
        cache = body as Country[];
        setCountries(cache);
      })
      .catch(() => {
        // keep fallback
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { dial, national } = useMemo(
    () => splitValue(value || defaultDial, countries),
    [value, defaultDial, countries]
  );

  function emit(nextDial: string, nextNational: string) {
    const cleaned = nextNational.replace(/[^\d ]/g, "").trim();
    onChange(cleaned ? `${nextDial}${cleaned}` : nextDial);
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <div className="flex gap-2">
        <div className="relative">
          <select
            value={dial}
            onChange={(e) => emit(e.target.value, national)}
            disabled={disabled}
            aria-label="Country dial code"
            className="h-10 appearance-none rounded-md border border-ink-200 bg-white pl-3 pr-8 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {countries.map((c) => (
              <option key={`${c.code}-${c.dial}`} value={c.dial}>
                {c.flag} {c.dial}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400"
          />
        </div>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          value={national}
          onChange={(e) => emit(dial, e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </label>
  );
}
