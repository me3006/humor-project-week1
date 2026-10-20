"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { safeNext } from "@/lib/categories";
export default function LoginButton({
  next = "/categories",
}: {
  next?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login() {
    setBusy(true);
    setError("");
    try {
      const db = createClient();
      const { error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
        },
      });
      if (error) throw error;
    } catch {
      setError("Could not start Google sign-in. Please try again.");
      setBusy(false);
    }
  }
  return (
    <>
      <button className="primary" disabled={busy} onClick={login}>
        {busy ? "Opening Google…" : "Sign in with Google"}{" "}
        <span aria-hidden="true">↗</span>
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
