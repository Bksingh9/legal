import { Aurora } from "./aurora";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-night-900 pt-28 text-white">
      <Aurora className="opacity-60" />
      <div className="container relative pb-20 pt-12 md:pb-24 md:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.2em] text-accent-400">{eyebrow}</p>
          ) : null}
          <h1 className="mt-4 text-balance font-serif text-hero font-normal text-white">
            {title}
          </h1>
          {description ? (
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-night-100/85">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
