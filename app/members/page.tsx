import Link from "next/link";
import { requireUser } from "@/lib/server";
import ProfileForm from "../profile-form";
import { categories } from "@/lib/categories";
export default async function Members() {
  const { db, user } = await requireUser("/categories");
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("first_name,last_name,avatar_url")
    .eq("id", user.id)
    .single();
  const { data: entries, error } = await db
    .from("wt_generations")
    .select(
      "id,joke,is_public,created_at,wt_stories!inner(body,category,user_id)",
    )
    .eq("wt_stories.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <main className="page members-page">
      <Link className="back" href="/categories">
        ← Back to categories
      </Link>
      <h1>
        Your little <em>book of life.</em>
      </h1>
      <div className="members-layout">
        <section className="paper profile">
          <h2>Make yourself at home</h2>
          {profileError ? (
            <p className="error">
              Your profile could not load. Please refresh.
            </p>
          ) : (
            <>
              <ProfileForm
                userId={user.id}
                initialFirstName={profile?.first_name || ""}
                initialLastName={profile?.last_name || ""}
                initialAvatarUrl={profile?.avatar_url || ""}
              />
            </>
          )}
        </section>
        <section className="saved-pages" aria-labelledby="saved-pages-heading">
          <h2 id="saved-pages-heading">Your saved pages</h2>
          <p className="muted">
            Every joke version has its own page and rating. Showing your latest
            100 versions.
          </p>
          {error ? (
            <p className="error">Saved pages could not load. Please refresh.</p>
          ) : entries?.length ? (
            <div className="scraps">
              {entries.map((e) => {
                const s = e.wt_stories as unknown as {
                  body: string;
                  category: string;
                };
                return (
                  <Link
                    className="entry-card"
                    key={e.id}
                    href={`/categories/${s.category}/create?generation=${e.id}`}
                  >
                    <span className="eyebrow">
                      {categories.find((c) => c.slug === s.category)?.name} ·{" "}
                      {e.is_public ? "Public" : "Private"}
                    </span>
                    <p className="story-text">{s.body}</p>
                    <p className="joke-note">{e.joke}</p>
                    <span>Open page ↗</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="notice">
              Your journal is waiting for its first story.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
