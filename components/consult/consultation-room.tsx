"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Props {
  consultationId: string;
  initialStatus: string;
  initialJitsiUrl: string | null;
  initialChannel: "call" | "video";
}

interface StartResp {
  ok?: boolean;
  channel?: "call" | "video";
  provider?: "hms" | "exotel" | "jitsi";
  jitsi_room_url?: string;
  hms_room_id?: string;
  hms_auth_token?: string;
  exotel_call_sid?: string;
  error?: string;
}

// Live consultation waiting room. Subscribes to status updates on the
// consultations row via supabase_realtime, manages the consent toggle,
// triggers /start when both consent flags are set, and surfaces the
// "Join call" button once a Jitsi URL is returned.
export function ConsultationRoom(props: Props) {
  const [status, setStatus] = useState(props.initialStatus);
  const [jitsiUrl, setJitsiUrl] = useState<string | null>(props.initialJitsiUrl);
  const [consentMine, setConsentMine] = useState<boolean | null>(null);
  const [consentOther, setConsentOther] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const supa = getSupabaseBrowserClient();
    if (!supa) return;
    let channel: ReturnType<typeof supa.channel> | null = null;
    void (async () => {
      const {
        data: { user }
      } = await supa.auth.getUser();
      if (!user) return;

      // Initial read of consent flags to know who-I-am.
      const { data: row } = await supa
        .from("consultations")
        .select(
          "user_id, recording_consent_user, recording_consent_lawyer, jitsi_room_url, status"
        )
        .eq("id", props.consultationId)
        .maybeSingle();
      if (row) {
        const isClient = row.user_id === user.id;
        setConsentMine(
          isClient ? row.recording_consent_user : row.recording_consent_lawyer
        );
        setConsentOther(
          isClient ? row.recording_consent_lawyer : row.recording_consent_user
        );
        setStatus(row.status);
        setJitsiUrl(row.jitsi_room_url);
      }

      channel = supa
        .channel(`consult:${props.consultationId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "consultations",
            filter: `id=eq.${props.consultationId}`
          },
          (payload) => {
            const next = payload.new as {
              status: string;
              jitsi_room_url: string | null;
              recording_consent_user: boolean | null;
              recording_consent_lawyer: boolean | null;
              user_id: string;
            };
            setStatus(next.status);
            setJitsiUrl(next.jitsi_room_url);
            const isClient = next.user_id === user.id;
            setConsentMine(
              isClient ? next.recording_consent_user : next.recording_consent_lawyer
            );
            setConsentOther(
              isClient ? next.recording_consent_lawyer : next.recording_consent_user
            );
          }
        )
        .subscribe();
    })();
    return () => {
      if (channel) {
        const supa2 = getSupabaseBrowserClient();
        if (supa2) void supa2.removeChannel(channel);
      }
    };
  }, [props.consultationId]);

  async function consent(value: boolean) {
    setBusy("consent");
    setError(null);
    try {
      const res = await fetch(`/api/consultations/${props.consultationId}/consent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consent: value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record consent.");
      setConsentMine(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record consent.");
    } finally {
      setBusy(null);
    }
  }

  async function start() {
    setBusy("start");
    setError(null);
    try {
      const res = await fetch(`/api/consultations/${props.consultationId}/start`, {
        method: "POST"
      });
      const data = (await res.json()) as StartResp;
      if (!res.ok) throw new Error(data.error ?? "Could not start.");
      if (data.jitsi_room_url) setJitsiUrl(data.jitsi_room_url);
      if (data.channel === "video" && data.provider === "jitsi") {
        setRecording(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setBusy(null);
    }
  }

  const bothConsented = consentMine !== null && consentOther !== null;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-md border border-ink-100 p-4">
        <p className="text-xs uppercase tracking-wide text-ink-400">Status</p>
        <p className="mt-1 text-sm font-medium text-ink-900">{prettyStatus(status)}</p>
        {status === "requested" || status === "matched" ? (
          <p className="mt-2 text-xs text-ink-700">
            We&apos;re routing your booking to a verified advocate. You&apos;ll
            be notified as soon as one accepts.
          </p>
        ) : null}
      </section>

      {(status === "scheduled" || status === "in_progress") && (
        <section className="rounded-md border border-ink-100 p-4">
          <p className="text-xs uppercase tracking-wide text-ink-400">
            Recording consent
          </p>
          <p className="mt-1 text-xs text-ink-700">
            Both parties must record their consent before the call starts.
            If either declines, the call still happens but is not recorded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => consent(true)}
              disabled={busy === "consent" || consentMine === true}
            >
              {consentMine === true ? "You consented" : "I consent to recording"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => consent(false)}
              disabled={busy === "consent" || consentMine === false}
            >
              {consentMine === false ? "You declined" : "I decline"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-400">
            Other party: {consentOther === null
              ? "pending"
              : consentOther
                ? "consented"
                : "declined"}
          </p>
        </section>
      )}

      {bothConsented && status !== "in_progress" && status !== "completed" && (
        <section className="rounded-md border border-ink-100 p-4">
          <Button type="button" onClick={start} disabled={busy === "start"}>
            {busy === "start" ? "Preparing call…" : "Start consultation"}
          </Button>
        </section>
      )}

      {jitsiUrl && (
        <section className="rounded-md border border-brand-500 bg-brand-50 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-700">Call ready</p>
          <p className="mt-1 text-sm">
            Open the link below to join the call. Audio and video both work in
            the browser. No download required.
          </p>
          <a
            href={jitsiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Join call
          </a>
          <p className="mt-2 break-all text-xs text-brand-700">{jitsiUrl}</p>
        </section>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function prettyStatus(s: string): string {
  switch (s) {
    case "requested":
      return "Looking for a lawyer";
    case "matched":
      return "Lawyer offers sent";
    case "scheduled":
      return "Lawyer accepted — get ready to start";
    case "in_progress":
      return "Consultation in progress";
    case "completed":
      return "Consultation complete";
    case "cancelled":
      return "Cancelled";
    case "disputed":
      return "Disputed — support team is on it";
    default:
      return s;
  }
}
