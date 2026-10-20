// Read-only live check after migration + seed. Never logs keys, stories, or prompts.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { categories } from "../lib/category-catalog.mjs";
import { loadPublicCollection } from "../lib/collection-query.mjs";
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
])
  if (!process.env[key]) throw new Error(`Configure ${key} first.`);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const publicDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  options,
);
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const { data: seeds, error } = await admin
  .from("wt_stories")
  .select("id,category,body")
  .not("seed_key", "is", null);
assert.ifError(error);
for (const { slug: category } of categories) {
  assert.ok(
    seeds.filter((s) => s.category === category).length >= 3,
    `Missing seeds: ${category}`,
  );
  const { data: entries, error: categoryError } = await loadPublicCollection(
    publicDb,
    category,
  );
  assert.ifError(categoryError);
  assert.ok(
    entries.length >= 3,
    `Public category query returned fewer than three entries: ${category}`,
  );
  assert.ok(
    entries.every((e) => e.is_public && e.wt_stories.category === category),
    `Wrong category returned: ${category}`,
  );
}
const { data: visible, error: readError } = await publicDb
  .from("wt_generations")
  .select("id,is_public,story_id,joke,model,provider_id");
assert.ifError(readError);
assert.ok(visible.length >= categories.length * 3);
assert.ok(visible.every((g) => g.is_public));
const { data: privateRows, error: privateError } = await publicDb
  .from("wt_generations")
  .select("id")
  .eq("is_public", false);
assert.ifError(privateError);
assert.equal(privateRows.length, 0);
for (const table of ["wt_prompts", "wt_ratings", "profiles"]) {
  const r = await publicDb.from(table).select("*").limit(1);
  assert.ok(r.error || r.data.length === 0, `${table} must not be public`);
}
for (const s of seeds) {
  const generation = visible.find((g) => g.story_id === s.id);
  assert.ok(generation, "Seed missing public joke");
  const { data: prompt, error } = await admin
    .from("wt_prompts")
    .select("payload")
    .eq("generation_id", generation.id)
    .single();
  assert.ifError(error);
  assert.ok(prompt.payload.instructions && prompt.payload.input);
  if (prompt.payload.provider === "gemini") {
    const input = JSON.parse(prompt.payload.input);
    assert.equal(
      input.story,
      s.body,
      "Saved prompt does not match the original story",
    );
    assert.equal(
      input.category,
      categories.find((c) => c.slug === s.category)?.name,
    );
    assert.equal(
      prompt.payload.request.systemInstruction.parts[0].text,
      prompt.payload.instructions,
    );
    assert.equal(
      prompt.payload.request.contents[0].parts[0].text,
      prompt.payload.input,
    );
    assert.ok(generation.joke && generation.model && generation.provider_id);
  }
}
console.log(
  `PASS: ${categories.length * 3}+ seeds across ${categories.length} categories; the site’s exact category queries load matching stories and jokes; private content protected; seed prompts stored.`,
);
console.log(
  "Run npm test for two-user SQL isolation checks. Complete the Google OAuth and browser checklist in README.md.",
);
