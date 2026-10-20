// Shared by the site and live diagnostic so both execute the same category query.
export const entryColumns =
  "id, story_id, joke, is_public, created_at, wt_stories!inner(body, category, seed_key)";
export function loadPublicCollection(db, category, limit = 3) {
  return db
    .from("wt_generations")
    .select(entryColumns)
    .eq("is_public", true)
    .eq("wt_stories.category", category)
    .order("created_at")
    .limit(limit);
}
