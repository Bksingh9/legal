import { MessageSquare, FileText, PhoneCall } from "lucide-react";
import { Reveal } from "@/components/ui/motion";

const steps = [
  {
    icon: MessageSquare,
    title: "Describe in your words",
    body: "Hindi or English, text or voice. No legal jargon required.",
    detail: "Tenant deposit not refunded, cheque bounced, NCDRC complaint, RTI — pick anything."
  },
  {
    icon: FileText,
    title: "Get a case prep, instantly",
    body: "One page: likely sections, next three steps, documents to gather, urgency.",
    detail: "Not legal advice — but enough to know whether you need a document or a call."
  },
  {
    icon: PhoneCall,
    title: "Take the next step",
    body: "Generate a document for ₹199–₹699, or talk to a verified advocate.",
    detail: "First 15-minute call is free. Browser-native — no app to download."
  }
];

export function HowItWorks() {
  return (
    <section className="relative bg-night-900 py-24 text-white md:py-32">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-400">How it works</p>
          <h2 className="mt-4 font-serif text-4xl md:text-5xl">
            Three steps. Most people stop after the first.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal
              key={s.title}
              delay={i * 0.08}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="absolute right-6 top-6 font-serif text-5xl text-white/10">
                0{i + 1}
              </div>
              <s.icon size={22} className="text-accent-400" />
              <h3 className="mt-6 text-xl font-medium">{s.title}</h3>
              <p className="mt-3 text-sm text-night-100/80">{s.body}</p>
              <p className="mt-4 text-xs text-night-100/50">{s.detail}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
