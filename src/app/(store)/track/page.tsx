import type { Metadata } from "next";
import Image from "next/image";
import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "Track your order", robots: { index: false } };

export default function TrackPage() {
  return (
    <main className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Track your order</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Enter your Order ID and the last 4 digits of the contact number you gave at checkout. You can also open the tracking link in your confirmation email.
        </p>
        <div className="mt-6">
          <TrackForm />
        </div>
      </div>
      {/* Blue Nova is the brand book's mascot for informational posts. */}
      <Image src="/brand/nova-blue.webp" alt="" width={900} height={876} unoptimized className="hidden h-auto w-64 justify-self-center md:block lg:w-72" />
    </main>
  );
}
