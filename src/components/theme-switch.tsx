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

function apply(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
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

  const pick = (value: Choice) => {
    try {
      if (value === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", value);
    } catch {
      /* private mode: the choice lasts until the page closes */
    }
    apply(value);
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-md border border-zinc-300 p-0.5 text-sm dark:border-zinc-700">
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => pick(c.value)}
          aria-pressed={choice === c.value}
          className={`rounded px-2.5 py-1 font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-700 ${choice === c.value ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
