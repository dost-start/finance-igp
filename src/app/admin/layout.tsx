import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

async function Who() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-500">{session.user.email}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/signin" });
        }}
      >
        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/admin" className="font-semibold">
          Merch admin
        </Link>
        <Suspense fallback={null}>
          <Who />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
