import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { auth, signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { MenuCloser } from "@/components/admin/menu-closer";
import { findActiveAdmin } from "@/lib/admin-accounts";
import { CURRENT_VERSION } from "@/lib/changelog";
import { isStoreLocked } from "@/lib/store";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
      <Image src="/brand/mark-color.webp" alt="" width={288} height={440} unoptimized className="h-8 w-auto dark:hidden" />
      <Image src="/brand/mark-white.webp" alt="" width={194} height={294} unoptimized className="hidden h-8 w-auto dark:block" />
      <span className="leading-tight">
        <span className="block text-base font-extrabold tracking-tight">Merch admin</span>
        <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">START: COLLECTIONS</span>
      </span>
    </Link>
  );
}

// Who is signed in: their Google picture with the Sign out button right beside it.
function Account({ email, image }: { email: string; image: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span title={email} className="size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700">
        {image ? (
          <Image src={image} alt={`Signed in as ${email}`} width={40} height={40} unoptimized referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <span role="img" aria-label={`Signed in as ${email}`} className="grid size-full place-items-center bg-brand-yellow text-base font-extrabold text-zinc-950">
            {email.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <form
        className="flex-1"
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/signin" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

// The signed-in frame: a sidebar on wide screens, a top bar with a drawer on phones. Whether anyone is signed
// in decides it, so the sign-in page gets just the brand and a centred card.
async function Chrome({ children }: { children: ReactNode }) {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="flex flex-1 flex-col px-4 py-10">
        <div className="mx-auto w-full max-w-sm">
          <Brand />
        </div>
        <div id="main" className="mx-auto w-full max-w-6xl flex-1">
          {children}
        </div>
      </div>
    );
  }

  const [admin, locked] = await Promise.all([findActiveAdmin(email), isStoreLocked()]);

  return (
    <div className="relative flex flex-1 flex-col lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <input id="admin-menu" type="checkbox" className="peer sr-only" aria-label="Open the admin menu" />
      <MenuCloser />

      {/* Phones: brand and the menu button. */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
        <Brand />
        <label
          htmlFor="admin-menu"
          className="grid size-10 cursor-pointer place-items-center rounded-xl border border-zinc-300 text-zinc-700 hover:bg-zinc-100 peer-focus-visible:outline-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <span className="sr-only">Menu</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
          </svg>
        </label>
      </header>

      <aside className="hidden flex-col gap-6 border-b border-zinc-200 bg-white p-4 peer-checked:flex lg:sticky lg:top-0 lg:flex lg:h-screen lg:border-b-0 lg:border-r lg:p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="hidden lg:block">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav showProducts={admin?.role === "tech"} version={CURRENT_VERSION} storeLocked={locked} />
        </div>
        <div className="border-t border-zinc-200 px-3 pt-4 dark:border-zinc-800">
          <Account email={email} image={session?.user?.image ?? null} />
        </div>
      </aside>

      <div id="main" className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<p className="p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>}>
        <Chrome>{children}</Chrome>
      </Suspense>
    </div>
  );
}
