"use client";

import { useRef } from "react";

// Header checkbox of the order table: ticks or clears every enabled row checkbox in the same form.
export function SelectAll() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all orders on this page"
      className="size-4"
      onChange={(e) => {
        const form = ref.current?.form;
        if (!form) return;
        // Real clicks, so React's change handler on the form runs and the selected count updates.
        for (const box of form.querySelectorAll<HTMLInputElement>('input[name="ids"]:not(:disabled)')) {
          if (box.checked !== e.currentTarget.checked) box.click();
        }
      }}
    />
  );
}
