import { loadPublicCollection } from "@/lib/collection-query.mjs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryFor, Entry } from "@/lib/categories";
import { session } from "@/lib/server";
import EntryCard from "@/app/components/entry-card";
export default async function Activity({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categoryFor(slug);
  if (!category) notFound();
  const { db } = await session();
  const result = db ? await loadPublicCollection(db, slug) : null;
  if (result?.error)
    console.error("Public collection query failed", {
      category: slug,
      code: result.error.code,
      message: result.error.message,
    });
  const entries = (result?.data || []) as unknown as Entry[];
  return (
    <main className="page activity-page">
      <div className="experience-nav">
        <Link className="back" href="/categories">
          ← Change category
        </Link>
        <div className="category-pill">
          {category.emoji} {category.name}
        </div>
      </div>
      <h1>
        Talk it out. Or <em>laugh it off.</em>
      </h1>
      <p className="intro">
        Some days you have a story. Some days you just want a good laugh.
      </p>
      <div className="activity-grid">
        <Link className="activity-card" href={`/categories/${slug}/create`}>
          <h2>
            Make it funny <span>↗</span>
          </h2>
          <p>
            Tell us what happened. Get a little AI-powered comic relief, just
            for you.
          </p>
        </Link>
        <Link className="activity-card peach" href={`/categories/${slug}/rate`}>
          <h2>
            Just here to rate <span>↗</span>
          </h2>
          <p>Read a story and its joke, then tell us how funny it really is.</p>
        </Link>
      </div>
      <section className="collection">
        <h2>A few pages from {category.name.toLowerCase()}</h2>
        {result?.error ? (
          <p className="notice">
            The public collection could not load. Please try again later.
          </p>
        ) : entries.length ? (
          <div className="scraps">
            {entries.map((e) => (
              <EntryCard entry={e} key={e.id} />
            ))}
          </div>
        ) : (
          <p className="notice">
            This collection is getting ready. Check back soon, or create a
            private joke of your own.
          </p>
        )}
      </section>
    </main>
  );
}
