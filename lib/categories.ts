import { categories } from "./category-catalog.mjs";
export { categories };
export function categoryFor(slug: string) {
  return categories.find((c) => c.slug === slug);
}
export type Entry = {
  id: string;
  story_id: string;
  joke: string;
  is_public: boolean;
  created_at: string;
  wt_stories: { body: string; category: string; seed_key: string | null };
  rating?: number | null;
};
export { entryColumns } from "./collection-query.mjs";
export function safeNext(value: string | null | undefined) {
  return value && /^\/categories\/[a-z-]+\/(create|rate)$/.test(value)
    ? value
    : "/categories";
}
