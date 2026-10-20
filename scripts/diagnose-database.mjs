import { createClient } from "@supabase/supabase-js";
import { categories } from "../lib/category-catalog.mjs";
import { loadPublicCollection } from "../lib/collection-query.mjs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key)
  throw new Error(
    "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
  );
const db = createClient(url, key, { auth: { persistSession: false } });
let failed = false;
for (const { slug } of categories) {
  const { data, error, status } = await loadPublicCollection(db, slug);
  if (error) {
    failed = true;
    console.error(
      `${slug}: HTTP ${status}, ${error.code || "network error"}: ${error.message}`,
    );
    if (["PGRST205", "PGRST200", "42P01"].includes(error.code)) {
      console.error(
        "The application schema or its relationships are missing from this Supabase project. Apply the SQL files in supabase/migrations in filename order using Supabase → SQL Editor, then run npm run seed.",
      );
      break;
    }
  } else if (!data || data.length < 3) {
    failed = true;
    console.error(
      `${slug}: only ${data?.length || 0} publicly readable entries. Run npm run seed after applying the migrations.`,
    );
  } else if (data.some((e) => !e.is_public || e.wt_stories.category !== slug)) {
    failed = true;
    console.error(
      `${slug}: query returned incorrectly categorized or private content.`,
    );
  } else {
    console.log(
      `${slug}: PASS — ${data.length} matching public story/joke cards loaded from Supabase.`,
    );
  }
}
if (failed) process.exitCode = 1;
