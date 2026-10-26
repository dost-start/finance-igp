import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findActiveAdmin } from "@/lib/admin-accounts";

// Google sign-in for finance and tech admins only. Buyers never sign in.
// Reads AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
// Letting someone through Google is not enough: every admin page, action and file route also
// checks the admin_accounts table, so deactivating an account cuts access immediately.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // one working day
  trustHost: true,
  pages: { signIn: "/admin/signin", error: "/admin/signin" },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email_verified) return false;
      return (await findActiveAdmin(profile.email)) !== null;
    },
  },
});
