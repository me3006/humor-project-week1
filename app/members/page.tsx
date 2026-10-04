import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function MembersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  return (
    <main>
      <h1>Members Only</h1>

      <p>
        You are logged in as{" "}
        {profile?.first_name || ""} {profile?.last_name || ""}
      </p>

      <p>This page is only available to logged-in users.</p>
    </main>
  );
}