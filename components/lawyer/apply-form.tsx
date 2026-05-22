"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneField } from "@/components/ui/phone-field";
import { IfscField } from "@/components/ui/ifsc-field";
import { ConsentCheckbox } from "@/components/legal/consent-checkbox";
import {
  SPECIALIZATIONS,
  LAWYER_LANGUAGES,
  type Specialization,
  type LawyerLanguage
} from "@/lib/lawyers/types";

type Stage = "idle" | "submitting" | "submitted" | "error";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal"
];

const LANGUAGE_LABELS: Record<LawyerLanguage, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu",
  kn: "Kannada", ml: "Malayalam", mr: "Marathi", bn: "Bengali",
  gu: "Gujarati", pa: "Punjabi"
};

export function LawyerApplyForm() {
  const [bar, setBar] = useState("");
  const [state, setState] = useState("");
  const [years, setYears] = useState<number | "">("");
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [langs, setLangs] = useState<LawyerLanguage[]>([]);
  const [hoursPerWeek, setHoursPerWeek] = useState<number | "">(5);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [notificationWhatsapp, setNotificationWhatsapp] = useState("+91");
  const [legalBiz, setLegalBiz] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("+91");
  const [vpa, setVpa] = useState("");
  const [acct, setAcct] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState<string | null>(null);

  function toggle<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStage("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/lawyer/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bar_council_id: bar,
          state,
          years_exp: typeof years === "number" ? years : 0,
          specializations: specs,
          languages: langs,
          hours_per_week: typeof hoursPerWeek === "number" ? hoursPerWeek : 5,
          availability_note: availabilityNote || undefined,
          notification_whatsapp:
            notificationWhatsapp && notificationWhatsapp !== "+91"
              ? notificationWhatsapp
              : undefined,
          pan: pan.toUpperCase(),
          gstin: gstin ? gstin.toUpperCase() : undefined,
          consent,
          payout: {
            legal_business_name: legalBiz,
            contact_name: contactName,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            upi_vpa: vpa,
            bank_account_no: acct,
            bank_ifsc: ifsc.toUpperCase()
          }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data.issues
          ? Object.keys(data.issues).filter((k) => k !== "_errors").join(", ")
          : "";
        setStage("error");
        setMessage(`${data.error ?? "Submission failed"}${issues ? ` (${issues})` : ""}`);
        return;
      }
      setStage("submitted");
      setMessage(
        data.check_email
          ? `Application received. Reference: ${data.anon_slug}. Check ${contactEmail} for a sign-in link to open your dashboard.`
          : `Application received. Reference: ${data.anon_slug}. Status: ${data.status}.`
      );
    } catch (err) {
      setStage("error");
      setMessage(err instanceof Error ? err.message : "Submission failed.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Bar Council
        </legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Bar Council ID *</span>
          <Input value={bar} onChange={(e) => setBar(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>State *</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-900 focus:outline-none"
            required
          >
            <option value="" disabled>Select your state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Years of practice *</span>
          <Input
            type="number"
            min={0}
            max={60}
            value={years === "" ? "" : String(years)}
            onChange={(e) => setYears(e.target.value === "" ? "" : Number(e.target.value))}
            required
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Specializations (1-5) *
        </legend>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((s) => (
            <label key={s} className="flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1 text-xs">
              <input
                type="checkbox"
                checked={specs.includes(s)}
                onChange={() => setSpecs(toggle(specs, s))}
              />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Languages (1-6) *
        </legend>
        <div className="flex flex-wrap gap-2">
          {LAWYER_LANGUAGES.map((l) => (
            <label key={l} className="flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1 text-xs">
              <input
                type="checkbox"
                checked={langs.includes(l)}
                onChange={() => setLangs(toggle(langs, l))}
              />
              <span>{LANGUAGE_LABELS[l]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Availability
        </legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Hours per week you can take consultations (1–60) *</span>
          <Input
            type="number"
            min={1}
            max={60}
            value={hoursPerWeek === "" ? "" : String(hoursPerWeek)}
            onChange={(e) =>
              setHoursPerWeek(e.target.value === "" ? "" : Number(e.target.value))
            }
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Availability note (optional, max 200 chars)</span>
          <Input
            value={availabilityNote}
            onChange={(e) => setAvailabilityNote(e.target.value)}
            placeholder="e.g. Mon-Fri 6-9pm, Sat 10am-2pm"
            maxLength={200}
          />
        </label>
        <PhoneField
          value={notificationWhatsapp}
          onChange={setNotificationWhatsapp}
          label="WhatsApp number for alerts (optional, falls back to contact phone)"
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Tax identifiers (required by Razorpay Route for payouts)
        </legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>PAN * <span className="text-neutral-500">(AAAAA9999A)</span></span>
          <Input
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            maxLength={10}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>GSTIN <span className="text-neutral-500">(optional — if you charge GST)</span></span>
          <Input
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            placeholder="27ABCDE1234F1Z5"
            maxLength={15}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Payout (provide UPI VPA <em>or</em> bank account + IFSC)
        </legend>
        <label className="flex flex-col gap-1 text-sm">
          <span>Legal name (as per Bar Council) *</span>
          <Input value={legalBiz} onChange={(e) => setLegalBiz(e.target.value)} required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Contact name *</span>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Email *</span>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
          </label>
          <PhoneField
            value={contactPhone}
            onChange={setContactPhone}
            label="Phone *"
            required
          />
          <label className="flex flex-col gap-1 text-sm">
            <span>UPI VPA</span>
            <Input value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@bank" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Bank account no.</span>
            <Input value={acct} onChange={(e) => setAcct(e.target.value)} />
          </label>
          <IfscField value={ifsc} onChange={setIfsc} />
        </div>
      </fieldset>

      <ConsentCheckbox
        checked={consent}
        onChange={setConsent}
        variant="compact"
        disabled={stage === "submitting"}
      />

      <Button type="submit" disabled={stage === "submitting" || !consent}>
        {stage === "submitting" ? "Submitting..." : "Submit application"}
      </Button>
      {message ? (
        <p className={stage === "error" ? "text-sm text-red-600" : "text-sm text-neutral-700"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
