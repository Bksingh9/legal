import Link from "next/link";
import { Aurora } from "./aurora";

type Props = {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

// Centered auth-card frame used by /auth/login, /signup, /forgot-password,
// /reset-password. Dark animated backdrop with a spotlight-style white card
// so the existing form components (light-mode tokens) still read cleanly.
// The fixed SiteNav floats over the backdrop; min-h-dvh + flex-center keeps
// the card vertically anchored on every viewport height.
export function AuthShell({ title, description, footer, children }: Props) {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-night-900 px-6 py-24">
      <Aurora className="opacity-60" />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 flex items-center justify-center gap-2 text-night-100/85 transition-colors hover:text-white"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent-400 to-brand-500 text-xs font-semibold text-night-900">
            L
          </span>
          <span className="text-sm tracking-tight">LegalDesk</span>
        </Link>
        <div className="rounded-2xl border border-ink-100 bg-white p-8 shadow-2xl shadow-night-900/40">
          <h1 className="font-serif text-3xl text-ink-900">{title}</h1>
          {description ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-700">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-night-100/85">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
