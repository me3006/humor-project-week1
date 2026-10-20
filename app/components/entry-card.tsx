import { Entry } from "@/lib/categories";
export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <article className="entry-card">
      {!entry.wt_stories.seed_key && (
        <span className="eyebrow">A shared moment</span>
      )}
      <p className="story-text">{entry.wt_stories.body}</p>
      <div className="joke-note" role="note" aria-label="AI-generated joke">
        <p>{entry.joke}</p>
      </div>
    </article>
  );
}
