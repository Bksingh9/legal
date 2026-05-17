"use client";

import Link from "next/link";

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  // Display variant — "compact" omits the marketing toggle (use for
  // signup), "full" shows it (use for lawyer apply + lead capture).
  variant?: "compact" | "full";
  marketingOptIn?: boolean;
  onMarketingChange?: (next: boolean) => void;
}

// DPDP §6-compliant consent. Required tick-box for processing
// personal data — must be a positive action, not pre-checked.
// Marketing consent is a separate optional toggle per DPDP §7(7).
export function ConsentCheckbox({
  checked,
  onChange,
  disabled,
  variant = "full",
  marketingOptIn = false,
  onMarketingChange
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-ink-100 bg-ink-50/50 p-3 text-xs text-ink-700">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required
          className="mt-0.5"
        />
        <span>
          I agree to LegalDesk AI&apos;s{" "}
          <Link href="/terms" className="underline" target="_blank" rel="noopener noreferrer">
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </Link>
          , and consent to the platform processing my personal data per
          the Digital Personal Data Protection Act, 2023.
          {" "}
          <span className="text-ink-400">*</span>
        </span>
      </label>

      {variant === "full" && onMarketingChange ? (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => onMarketingChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span>
            Send me occasional product updates and helpful legal-guide
            emails. <span className="text-ink-400">(optional, you can opt
            out anytime)</span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
