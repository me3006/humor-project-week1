"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { error } = await createClient().auth.signOut();
          if (error) {
            setError("Could not sign out. Please retry.");
            setBusy(false);
          } else {
            router.push("/");
            router.refresh();
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
