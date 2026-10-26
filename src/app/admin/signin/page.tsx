import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth, signIn } from "@/auth";
import { findActiveAdmin } from "@/lib/admin-accounts";

export const metadata: Metadata = { title: "Sign in" };

async function SignIn({ searchParams }: { searchParams: PageProps<"/admin/signin">["searchParams"] }) {
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const session = await auth();
  if (await findActiveAdmin(session?.user?.email)) redirect("/admin");

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <h1 className="text-xl font-semibold">Admin sign-in</h1>
      <p className="mt-2 text-sm text-zinc-500">For the START-DOST Finance and Technology teams. Use the Google account that was added for you.</p>
      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error === "AccessDenied" ? "That Google account does not have admin access. Ask the Technology team to add it." : "Sign-in did not work. Please try again."}
        </p>
      )}
      <form
        className="mt-5"
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/admin" });
        }}
      >
        <button type="submit" className="w-full rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          Sign in with Google
        </button>
      </form>
    </div>
  );
}

export default function SignInPage({ searchParams }: PageProps<"/admin/signin">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <SignIn searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
