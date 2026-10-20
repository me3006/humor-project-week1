import Link from "next/link";
import { categories } from "@/lib/categories";
export default function Categories() {
  return (
    <main className="page categories-page">
      <Link className="back" href="/">
        ← Back to the room
      </Link>
      <h1>
        What kind of day are we <em>having?</em>
      </h1>
      <p className="intro">Pick a topic to create or rate jokes.</p>
      <div className="category-grid">
        {categories.map((c) => (
          <Link
            className="category-card"
            data-category={c.slug}
            key={c.slug}
            href={`/categories/${c.slug}`}
          >
            <span className="emoji" aria-hidden="true">
              {c.emoji}
            </span>
            <h2>{c.name}</h2>
            <p>{c.hint}</p>
            <span className="card-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
