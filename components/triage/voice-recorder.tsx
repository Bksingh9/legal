"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type State = "idle" | "recording" | "uploading" | "error";

interface Props {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}

const MAX_SECONDS = 90;

export function VoiceRecorder({ onTranscribed, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopTicker(), []);

  function stopTicker() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function teardownStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Microphone access is not available in this browser.");
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickSupportedMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        teardownStream();
        const blob = new Blob(chunksRef.current, {
          type: mime ?? "audio/webm"
        });
        upload(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setState("recording");
      setSeconds(0);
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) stop();
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Could not access microphone.");
      setState("error");
    }
  }

  function stop() {
    stopTicker();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      setState("uploading");
      rec.stop();
    } else {
      setState("idle");
    }
  }

  async function upload(blob: Blob) {
    if (blob.size === 0) {
      setState("idle");
      return;
    }
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    try {
      const res = await fetch("/api/triage/transcribe", {
        method: "POST",
        body: fd
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { text?: string };
      if (data.text) onTranscribed(data.text);
      setState("idle");
    } catch (err) {
      console.error(err);
      setError("Transcription failed.");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {state === "recording" ? (
        <Button type="button" onClick={stop}>
          Stop ({seconds}s)
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || state === "uploading"}
          onClick={start}
        >
          {state === "uploading" ? "Transcribing..." : "Record voice"}
        </Button>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}
