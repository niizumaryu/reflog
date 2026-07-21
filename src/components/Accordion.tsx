// Native <details>/<summary> based accordion: keyboard-operable and
// screen-reader friendly with zero JS state, and its open/close needs no
// animation (respects prefers-reduced-motion by not fighting it with a
// height transition). Used on the home page to move secondary,
// look-it-up-later content (detailed stats) behind a step so the initial
// screen isn't a single long scroll of equally-weighted sections.
export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-2xl border border-white/10 bg-white/[0.03] open:pb-4"
      open={defaultOpen}
    >
      <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold text-cyan-300 marker:content-none [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-4 px-4">{children}</div>
    </details>
  );
}

export default Accordion;
