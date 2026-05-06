import Link from "next/link";
import { listSkus } from "@/lib/skus";

export const metadata = {
  title: "Legal documents — LegalDesk AI",
  description:
    "Generate India-compliant legal documents in plain language: legal notices, replies, rent agreements, consumer complaints, RTI applications."
};

export default function DocumentsIndex() {
  const skus = listSkus();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Legal documents</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Pick a document type. Fill a guided form. Pay. Receive PDF and DOCX
          on email and WhatsApp.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {skus.map((s) => (
          <li key={s.id}>
            <Link
              href={`/documents/${s.id}`}
              className="flex items-baseline justify-between rounded-md border border-neutral-200 p-4 hover:border-neutral-900"
            >
              <div>
                <p className="text-base font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{s.short_description}</p>
              </div>
              <p className="ml-4 text-sm font-medium tabular-nums">
                {(s.price_paise / 100).toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0
                })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
