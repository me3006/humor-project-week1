import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { generateJoke } from "../lib/ai.mjs";
import { categories } from "../lib/category-catalog.mjs";
export const stories = {
  dating: [
    "I waved at my date across the restaurant, then spent ten minutes having dinner with someone who had the same first name.",
    "I practiced a casual greeting before my first date and accidentally said the words casual greeting when they arrived.",
    "I tried to impress my date by ordering in French. The waiter replied in English and brought me three soups.",
  ],
  "friendship-drama": [
    "I sent a screenshot of our group chat back to the exact same group chat while trying to complain about it.",
    "I organized a surprise party for my friend, but they organized a quiet night at home and turned off their phone.",
    "I told two friends I was too busy to go out, then ran into both of them while buying a giant bag of snacks.",
  ],
  "cooking-disasters": [
    "I baked a birthday cake and forgot the flour. I served the candles in a warm bowl of chocolate instead.",
    "I spent two hours making soup, then poured it through a colander and watched dinner disappear down the drain.",
    "I followed a recipe that said season to taste. Now my pasta tastes exclusively of confidence and cinnamon.",
  ],
  "late-again": [
    "I left home early for once, then sat on the wrong train for twenty minutes feeling proud of my time management.",
    "I joined a meeting late and said sorry, traffic. I work from home and everyone could see my unmade bed.",
    "I set five alarms for an early class and somehow incorporated every single one into a dream about a fire station.",
  ],
  work: [
    "I ended a serious work call by saying love you. My boss said thanks and asked about the spreadsheet again.",
    "I spent an hour looking for the spreadsheet I had named final final actual final and found it in a folder called old.",
    "I gave a confident presentation on mute. By the time someone told me, I had already thanked everyone for listening.",
  ],
  "student-life": [
    "I highlighted almost every line in my textbook, then realized the only thing I had studied was the color yellow.",
    "I submitted my essay one minute before the deadline and discovered I had uploaded my grocery list instead.",
    "I carried a heavy textbook to campus all semester. The exam was open book and I forgot it at home.",
  ],
  "roommate-life": [
    "I made a cleaning rota for my roommates. They used it as a coaster, and now Tuesday has a coffee ring.",
    "I asked my roommate to stop leaving dishes in the sink. They moved the entire stack onto my desk instead.",
    "I labeled my leftovers with my name. My roommate ate them and left a note saying they were proud of my cooking.",
  ],
  "something-else": [
    "I waved back at someone who was waving at the person behind me, then pretended I was stretching for a full minute.",
    "I cleaned my apartment for a video call and then spent the entire call using a virtual background.",
    "I bought a planner to organize my life and immediately lost it under the pile of things I needed to organize.",
  ],
};
async function main() {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GEMINI_API_KEY",
  ])
    if (!process.env[name]) throw new Error(`Set ${name} in .env.local first.`);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const requested = process.argv
    .find((arg) => arg.startsWith("--category="))
    ?.split("=")[1];
  if (requested && !categories.some((c) => c.slug === requested))
    throw new Error("Unknown seed category.");
  const selected = categories.filter((c) => !requested || c.slug === requested);
  for (const { slug: category, name } of selected) {
    const entries = stories[category];
    if (!entries || entries.length < 3)
      throw new Error(
        `At least three seed stories are required for ${category}.`,
      );
    for (const [i, body] of entries.entries()) {
      const key = `journal-v1:${category}:${i + 1}`;
      const { data, error } = await db
        .from("wt_stories")
        .select("id")
        .eq("seed_key", key)
        .maybeSingle();
      if (error) throw new Error(`Database not ready: ${error.message}`);
      if (data) {
        console.log(`Already seeded: ${key}`);
        continue;
      }
      const result = await generateJoke(name, body);
      const { error: saveError } = await db.rpc("wt_seed_entry", {
        p_key: key,
        p_category: category,
        p_body: body,
        p_joke: result.joke,
        p_prompt: result.prompt,
        p_model: result.model,
        p_provider_id: result.provider_id,
      });
      if (saveError) throw new Error(`Seed save failed: ${saveError.message}`);
      console.log(`Seeded: ${key}`);
      // Avoid bursting the free tier. Quotas vary; rerun safely if exhausted.
      await delay(6500);
    }
  }
  console.log(
    `Verified seed insertion for ${selected.reduce((n, c) => n + stories[c.slug].length, 0)} fictional stories and their AI jokes.`,
  );
}
if (process.argv[1]?.endsWith("/seed.mjs"))
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
