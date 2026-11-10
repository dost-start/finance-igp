import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { auth, signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { findActiveAdmin } from "@/lib/admin-accounts";
import { CURRENT_VERSION } from "@/lib/changelog";
import { isStoreLocked } from "@/lib/store";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

// The Products link is only for the Technology team: finance members never see it.
async function Nav() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email) return null; // the sign-in page shows the brand only
  const admin = await findActiveAdmin(email);
  return <AdminNav showProducts={admin?.role === "tech"} version={CURRENT_VERSION} />;
}

// Who is signed in, and Sign out, in the top right corner.
async function Account() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[16rem] truncate text-sm text-zinc-500 md:inline dark:text-zinc-400" title={email}>
        {email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/signin" });
        }}
      >
        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-700 dark:hover:bg-zinc-800">
          Sign out
        </button>
      </form>
    </div>
  );
}

// A small always-visible reminder of whether buyers can order right now. It links to Store settings.
async function StorePill() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const locked = await isStoreLocked();
  return (
    <Link
      href="/admin/settings"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${locked ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200" : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-950"}`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${locked ? "bg-amber-600" : "bg-emerald-600"}`} />
      {locked ? "Store closed" : "Store open"}
    </Link>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
            <Image src="/brand/mark-color.webp" alt="" width={288} height={440} unoptimized className="h-6 w-auto dark:hidden" />
            <Image src="/brand/mark-white.webp" alt="" width={194} height={294} unoptimized className="hidden h-6 w-auto dark:block" />
            Merch admin
          </Link>
          <Suspense fallback={null}>
            <Nav />
          </Suspense>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            <Suspense fallback={null}>
              <StorePill />
            </Suspense>
            <Suspense fallback={null}>
              <Account />
            </Suspense>
          </div>
        </div>
      </header>
      <div id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </div>
    </div>
  );
}
