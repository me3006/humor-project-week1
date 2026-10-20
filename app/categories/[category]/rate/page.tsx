import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryFor, Entry } from "@/lib/categories";
import { requireUser } from "@/lib/server";
import RateJournal from "@/app/components/rate-journal";
export default async function Rate({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categoryFor(slug);
  if (!category) notFound();
  const { db } = await requireUser(`/categories/${slug}/rate`);
  const { data, error } = await db.rpc("wt_next_entry", { p_category: slug });
  return (
    <main className="page experience-page rate-page">
      <div className="experience-nav">
        <Link className="back" href={`/categories/${slug}`}>
          ← Choose create or rate
        </Link>
        <div className="category-pill">
          {category.emoji} {category.name}
        </div>
        <Link href="/categories">Change category ↗</Link>
      </div>
      <h1>
        Every story has a <em>funny side.</em>
      </h1>
      <p className="intro">Read the story and joke, then give it a rating.</p>
      {error ? (
        <div role="alert" className="notice">
          The collection could not load. Please refresh or try again later.
        </div>
      ) : data ? (
        <RateJournal key={(data as Entry).id} entry={data as Entry} />
      ) : (
        <section className="paper empty">
          <span className="activity-icon">✓</span>
          <h2>You’re all caught up.</h2>
          <p>You’ve rated every available entry in this category.</p>
          <Link className="button primary" href="/categories">
            Try another category ↗
          </Link>
          <Link className="back" href={`/categories/${slug}/create`}>
            Write a story of your own
          </Link>
        </section>
      )}
    </main>
  );
}
