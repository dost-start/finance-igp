const STEPS = ["Cart", "Your details", "Payment"] as const;

// Where the buyer is in the three-step order: steps before `current` are done, `current` is highlighted.
export function OrderSteps({ current }: { current: 2 | 3 }) {
  return (
    <ol aria-label="Order steps" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-semibold">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "now" : "next";
        return (
          <li key={label} className="flex items-center gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span
              className={
                "grid size-7 place-items-center rounded-full text-xs font-extrabold " +
                (state === "now"
                  ? "bg-brand-yellow text-zinc-950"
                  : state === "done"
                    ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950"
                    : "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400")
              }
            >
              {state === "done" ? (
                <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                </svg>
              ) : (
                n
              )}
            </span>
            <span className={state === "next" ? "text-zinc-500 dark:text-zinc-400" : ""}>{label}</span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-5 bg-zinc-300 sm:w-8 dark:bg-zinc-700" />}
          </li>
        );
      })}
    </ol>
  );
}
