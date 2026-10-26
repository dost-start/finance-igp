import { setStoreLock } from "@/app/admin/extras-actions";

// Open or close the store. Any finance or technology member can use it. While closed, nobody can place
// an order or send a payment; finance keeps working on the orders already in.
export function StoreSwitch({ locked }: { locked: boolean }) {
  return (
    <section aria-label="Store status" className={`mt-5 rounded-lg border p-4 ${locked ? "border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" : "border-zinc-200 dark:border-zinc-800"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{locked ? "The store is CLOSED" : "The store is open"}</h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {locked ? "Buyers see a friendly closed message and cannot place orders or send payments." : "Buyers can place orders and send payments. Close it to stop both at once."}
          </p>
        </div>
        <form action={setStoreLock.bind(null, !locked)}>
          <button
            type="submit"
            className={`rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${locked ? "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700" : "border border-red-700 text-red-800 hover:bg-red-50 focus-visible:outline-red-700 dark:text-red-300 dark:hover:bg-red-950"}`}
          >
            {locked ? "Reopen the store" : "Close the store"}
          </button>
        </form>
      </div>
    </section>
  );
}
