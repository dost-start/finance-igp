import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TrackingResult } from "@/components/tracking-result";
import { trackByToken } from "@/lib/track";
import { TOKEN_SHAPE } from "@/lib/tracking-view";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

async function Tracked({ params }: { params: PageProps<"/track/[token]">["params"] }) {
  const { token } = await params;
  if (!TOKEN_SHAPE.test(token)) notFound();
  const order = await trackByToken(token);
  if (!order) notFound();
  return <TrackingResult order={order} />;
}

export default function TrackedPage({ params }: PageProps<"/track/[token]">) {
  return (
    <main>
      <h1 className="text-2xl font-semibold tracking-tight">Your order</h1>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your order…</p>}>
          <Tracked params={params} />
        </Suspense>
      </div>
      <Link href="/track" className="mt-6 inline-block text-sm underline underline-offset-4">
        Track with an Order ID instead
      </Link>
    </main>
  );
}
