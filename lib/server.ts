import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createClient as supabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
export const configured = () =>
  !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
export async function session() {
  if (!configured()) return { db: null, user: null };
  const db = createClient(await cookies());
  const {
    data: { user },
  } = await db.auth.getUser();
  return { db, user };
}
export async function requireUser(next: string) {
  const s = await session();
  if (!s.user || !s.db) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { db: s.db, user: s.user };
}
export function admin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error(
      "Database generation is not configured yet. Please finish setup.",
    );
  return supabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function failure(error: unknown, status = 400) {
  return Response.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
    },
    { status },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
