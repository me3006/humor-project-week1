"use client";

import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  };

  return (
    <button onClick={handleLogout}>
      Log out
    </button>
  );
}