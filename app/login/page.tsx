import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/categories";
import { configured, session } from "@/lib/server";
import LoginButton from "../login-button";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  const next = safeNext(p.next);
  const { user } = await session();
  if (user) redirect(next);
  return (
    <main className="page narrow">
      <Link className="back" href="/categories">
        ← Back to categories
      </Link>
      <section className="paper login">
        <h1>
          A familiar
          <br />
          <em>face helps.</em>
        </h1>
        <p>
          Sign in to create jokes or save your ratings. We’ll keep your place.
        </p>
        <p className="muted">
          Your stories stay private unless you choose to share them.
        </p>
        {p.error && (
          <p role="alert" className="error">
            Sign-in did not finish. Please try again.
          </p>
        )}
        {configured() ? (
          <LoginButton next={next} />
        ) : (
          <p className="notice">
            Sign-in is waiting for the Supabase environment variables. See
            README.md for setup.
          </p>
        )}
      </section>
    </main>
  );
}
