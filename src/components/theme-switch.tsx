"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Choice = "system" | "light" | "dark";
const CHOICES: { value: Choice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// The saved choice lives in localStorage ("theme": light, dark, or missing for System). Reading it through
// useSyncExternalStore keeps the server render and the first client render identical (both say System).
function read(): Choice {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("theme-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("theme-change", onChange);
  };
}

const resolve = (choice: Choice): "dark" | "light" =>
  choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";

function apply(choice: Choice) {
  document.documentElement.dataset.theme = resolve(choice);
}

// Switching by hand animates: the new theme spreads out as a circle from the button that was pressed (View
// Transitions API). Browsers without it, people who ask for reduced motion, and picks that do not change the
// colours (System when the device already matches) switch at once.
function applyAnimated(choice: Choice, from: { x: number; y: number }) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce || root.dataset.theme === resolve(choice)) {
    apply(choice);
    return;
  }
  const radius = Math.hypot(Math.max(from.x, window.innerWidth - from.x), Math.max(from.y, window.innerHeight - from.y));
  root.dataset.themeSwitching = "";
  const transition = document.startViewTransition(() => apply(choice));
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${radius}px at ${from.x}px ${from.y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => delete root.dataset.themeSwitching);
}

// The saved choice, the follow-the-device behaviour and the pick action, shared by the button group and the menu.
function useTheme(animate = true) {
  const choice = useSyncExternalStore(subscribe, read, () => "system" as Choice);

  // While on System, follow the device when it switches (for example at sunset).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (read() === "system") apply("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const pick = (value: Choice, from: { x: number; y: number }) => {
    try {
      if (value === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", value);
    } catch {
      /* private mode: the choice lasts until the page closes */
    }
    if (animate) applyAnimated(value, from);
    else apply(value);
    window.dispatchEvent(new Event("theme-change"));
  };
  return { choice, pick };
}

// A dropdown version for the admin sidebar: one row like the other links, showing the current choice, that
// opens a short list. Escape or a click elsewhere closes it. The admin switches theme at once, with no circle
// animation (that belongs to the shop).
export function ThemeMenu({ icon }: { icon: React.ReactNode }) {
  const { choice, pick } = useTheme(false);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = CHOICES.find((c) => c.value === choice)?.label ?? "System";

  return (
    <div ref={wrap}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="theme-menu-list"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        {icon}
        <span className="admin-label">Theme</span>
        <span className="admin-label ml-auto flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{current}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </span>
      </button>
      {open && (
        <ul id="theme-menu-list" className="admin-hide-rail mt-1 space-y-0.5 pl-3">
          {CHOICES.map((c) => (
            <li key={c.value}>
              <button
                type="button"
                aria-pressed={choice === c.value}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  pick(c.value, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl py-2 pl-9 pr-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                  choice === c.value ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {c.label}
                {choice === c.value && (
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-auto size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ThemeSwitch() {
  const { choice, pick } = useTheme();

  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-md border border-zinc-300 p-0.5 text-sm dark:border-zinc-700">
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            pick(c.value, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }}
          aria-pressed={choice === c.value}
          className={`rounded px-2.5 py-1 font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${choice === c.value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
