import type { Metadata } from "next";
import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default function TrackPage() {
  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">Track your order</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-500">
        Enter your Order ID and the last 4 digits of the contact number you gave at checkout. You can also open the tracking link in your confirmation email.
      </p>
      <div className="mt-6">
        <TrackForm />
      </div>
    </main>
  );
}
