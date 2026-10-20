import { loadPublicCollection } from "@/lib/collection-query.mjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryFor, Entry, entryColumns } from "@/lib/categories";
import { requireUser } from "@/lib/server";
import CreateJournal from "@/app/components/create-journal";
export default async function Create({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ generation?: string; fresh?: string }>;
}) {
  const { category: slug } = await params;
  const category = categoryFor(slug);
  if (!category) notFound();
  const { db, user } = await requireUser(`/categories/${slug}/create`);
  const query = await searchParams;
  const inspiration = await loadPublicCollection(db, slug);
  if (inspiration.error)
    console.error("Inspiration query failed", {
      category: slug,
      code: inspiration.error.code,
      message: inspiration.error.message,
    });
  let initial: Entry | null = null;
  let loadError = "";
  if (query.fresh !== "1") {
    let q = db
      .from("wt_generations")
      .select(entryColumns)
      .eq("wt_stories.user_id", user.id)
      .eq("wt_stories.category", slug)
      .order("created_at", { ascending: false })
      .limit(1);
    if (query.generation) q = q.eq("id", query.generation);
    const { data, error } = await q;
    if (error)
      loadError =
        "Your saved journal could not load. Please refresh or try again later.";
    initial = (data?.[0] as unknown as Entry) || null;
    if (initial) {
      const { data: r, error: ratingError } = await db
        .from("wt_ratings")
        .select("value")
        .eq("user_id", user.id)
        .eq("generation_id", initial.id)
        .maybeSingle();
      if (ratingError)
        loadError = "Your saved rating could not load. Please refresh.";
      else initial.rating = r?.value ?? null;
    }
  }
  return (
    <main className="page experience-page">
      <div className="experience-nav">
        <Link className="back" href={`/categories/${slug}`}>
          ← Choose create or rate
        </Link>
        <div className="category-pill">
          {category.emoji} {category.name}
        </div>
        <Link href="/categories">Change category ↗</Link>
      </div>
      <CreateJournal
        key={initial?.id || `${slug}-new`}
        category={slug}
        initial={initial}
        inspiration={(inspiration.data || []) as unknown as Entry[]}
        loadError={loadError}
        inspirationError={!!inspiration.error}
      />
    </main>
  );
}
