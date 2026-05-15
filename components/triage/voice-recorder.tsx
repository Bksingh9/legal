"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type State = "idle" | "listening" | "uploading" | "error" | "unsupported";

interface Props {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}

// Minimal Web Speech API surface. The standard names this `SpeechRecognition`;
// Chromium-based browsers expose it as `webkitSpeechRecognition`.
interface MinimalSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0?: { transcript: string };
  }>;
}

interface SpeechErrorEvent {
  error?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  }
}

const MAX_SECONDS = 90;
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus"
];

export function VoiceRecorder({ onTranscribed, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [lang, setLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const [mode, setMode] = useState<"speech-api" | "upload" | "none">("none");

  const recognizerRef = useRef<MinimalSpeechRecognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    const hasSpeechApi = Boolean(
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    );
    if (hasSpeechApi) {
      setMode("speech-api");
    } else if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof MediaRecorder !== "undefined"
    ) {
      setMode("upload");
    } else {
      setMode("none");
      setState("unsupported");
    }
    return () => {
      stopTicker();
      teardownStream();
    };
  }, []);

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

  function startTicker() {
    setSeconds(0);
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) stop();
        return next;
      });
    }, 1000);
  }

  function startSpeechApi() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    finalTextRef.current = "";
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r?.isFinal) {
          finalTextRef.current += " " + (r[0]?.transcript ?? "");
        }
      }
    };
    rec.onerror = (e) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      setError(
        e?.error === "not-allowed"
          ? "Microphone permission denied."
          : "Voice recognition failed."
      );
      setState("error");
    };
    rec.onend = () => {
      stopTicker();
      const text = finalTextRef.current.trim();
      if (text) onTranscribed(text);
      setState((s) => (s === "error" ? s : "idle"));
    };
    recognizerRef.current = rec;
    setState("listening");
    rec.start();
    startTicker();
  }

  async function startUpload() {
    if (!navigator.mediaDevices) {
      setError("Microphone access is not available in this browser.");
      setState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MIME_CANDIDATES.find((m) =>
        MediaRecorder.isTypeSupported(m)
      );
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
      setState("listening");
      startTicker();
    } catch (err) {
      console.error(err);
      setError("Could not access microphone.");
      setState("error");
    }
  }

  async function upload(blob: Blob) {
    if (blob.size === 0) {
      setState("idle");
      return;
    }
    setState("uploading");
    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");
    fd.append("language", lang);
    try {
      const res = await fetch("/api/triage/transcribe", {
        method: "POST",
        body: fd
      });
      const data = (await res.json().catch(() => ({}))) as {
        text?: string;
        mode?: string;
        error?: string;
      };
      if (res.status === 501 || data.mode === "mock") {
        setError(
          "Voice input needs Chrome or Edge in this mode. Please type your query."
        );
        setState("error");
        return;
      }
      if (!res.ok || !data.text) {
        throw new Error(data.error ?? "Transcription failed.");
      }
      onTranscribed(data.text);
      setState("idle");
    } catch (err) {
      console.error(err);
      setError("Transcription failed.");
      setState("error");
    }
  }

  function start() {
    setError(null);
    if (mode === "speech-api") startSpeechApi();
    else if (mode === "upload") void startUpload();
  }

  function stop() {
    stopTicker();
    if (mode === "speech-api") {
      recognizerRef.current?.stop();
    } else if (mode === "upload") {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    }
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-neutral-500">
        Voice input is not available in this browser. Please type your query.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="voice-lang">
        Voice language
      </label>
      <select
        id="voice-lang"
        value={lang}
        onChange={(e) => setLang(e.target.value as "en-IN" | "hi-IN")}
        disabled={state === "listening" || state === "uploading" || disabled}
        className="h-10 rounded-md border border-ink-200 bg-white px-2 text-sm"
      >
        <option value="en-IN">English</option>
        <option value="hi-IN">हिन्दी</option>
      </select>
      {state === "listening" ? (
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
          {state === "uploading" ? "Transcribing…" : "Record voice"}
        </Button>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
