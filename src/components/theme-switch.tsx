"use client";

import { useEffect, useSyncExternalStore } from "react";

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

export function ThemeSwitch() {
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
    applyAnimated(value, from);
    window.dispatchEvent(new Event("theme-change"));
  };

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
