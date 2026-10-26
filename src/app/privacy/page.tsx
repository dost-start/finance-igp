import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How START-DOST handles the personal data you give when ordering merchandise.",
};

// DRAFT for Finance review before launch. Retention period and contact route need their confirmation.
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 text-zinc-900 dark:text-zinc-100">
      <p className="text-sm text-zinc-500">Last updated: October 26, 2026</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacy Notice</h1>
      <p className="mt-4 leading-7">
        START: COLLECTIONS is the official merchandise shop of START-DOST. This notice explains what personal
        information we collect when you place an order, why we collect it, and your rights under the Data Privacy
        Act of 2012 (Republic Act No. 10173).
      </p>

      <h2 className="mt-8 text-xl font-semibold">What we collect</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 leading-7">
        <li>Your name, university and university address.</li>
        <li>Your home address (a map link and a landmark), contact number and email address.</li>
        <li>The items, sizes and quantities you order, and your order total.</li>
        <li>Your payment receipt image, the payment channel you used and your reference number.</li>
      </ul>
      <p className="mt-3 leading-7">We collect only what the Finance team needs to confirm your payment and deliver your order.</p>

      <h2 className="mt-8 text-xl font-semibold">Why we collect it</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 leading-7">
        <li>To check that your payment matches your order. To help with this, your phone reads the amount and reference number on your receipt image before you submit it. The reading happens on your device, and only the two values it finds are sent with your order. Finance still checks every payment by hand.</li>
        <li>To prepare and deliver your merchandise.</li>
        <li>To email you about your order status, and to let you track it.</li>
      </ul>
      <p className="mt-3 leading-7">We do not sell your information and we do not use it for marketing.</p>

      <h2 className="mt-8 text-xl font-semibold">Who can see it</h2>
      <p className="mt-3 leading-7">
        Only signed-in members of the START-DOST Finance and Technology teams can see your order details and
        receipt. The order tracking page shows only your order status, and only after the Order ID and the last four
        digits of your contact number match.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Where it is stored</h2>
      <p className="mt-3 leading-7">
        Order records are kept in a managed database (Supabase). Receipt images are kept in a private Google Drive
        folder that is not shared. The website is hosted on Vercel, and status emails are sent from the Finance
        team&apos;s Gmail account. These providers process data on our behalf.
      </p>

      <h2 className="mt-8 text-xl font-semibold">How long we keep it</h2>
      <p className="mt-3 leading-7">
        We keep your information only as long as needed to fulfil, deliver and reconcile your order, then delete or
        anonymize it. The exact retention period will be confirmed by the Finance team.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Your rights</h2>
      <p className="mt-3 leading-7">
        You may ask to see the information we hold about you, to correct it, to object to its processing, or to have
        it deleted, subject to what we need to keep for our records. Send these requests through the merch ticket
        form linked in your order emails.
      </p>

      <p className="mt-10">
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to the shop
        </Link>
      </p>
    </main>
  );
}
