"use client";

interface Props {
  text: string;
  phone?: string; // E.164 without +; if omitted, opens the share picker
  className?: string;
}

// Zero-key WhatsApp share. Uses wa.me deep link; user picks the
// recipient in their WhatsApp client. Works on mobile and desktop.
export function WhatsAppShare({ text, phone, className }: Props) {
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const href = `${base}?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex h-10 items-center justify-center rounded-md border border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 hover:bg-ink-50"
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="mr-2"
      >
        <path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.46 0 .1 5.36.1 11.94c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 0 0 5.77 1.47h.01c6.58 0 11.93-5.36 11.93-11.94 0-3.19-1.24-6.18-3.47-8.41ZM12.05 21.8h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.72.97 1-3.62-.24-.37a9.84 9.84 0 0 1-1.51-5.25c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.85-9.9 9.85Zm5.42-7.39c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.07-.79.37c-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
      </svg>
      Share on WhatsApp
    </a>
  );
}
