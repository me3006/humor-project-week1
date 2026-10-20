"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Entry } from "@/lib/categories";
import EntryCard from "./entry-card";
import Ratings from "./ratings";
export async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Could not finish that request. Please retry.",
    );
  return data;
}
export default function CreateJournal({
  category,
  initial,
  inspiration,
  loadError,
  inspirationError,
}: {
  category: string;
  initial: Entry | null;
  inspiration: Entry[];
  loadError: string;
  inspirationError: boolean;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState(initial);
  const [story, setStory] = useState(initial?.wt_stories.body || "");
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(loadError);
  const [status, setStatus] = useState("");
  const requestId = useRef("");
  const lock = useRef(false);
  async function run(label: string, task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    setError("");
    setStatus("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not finish. Please retry.",
      );
    } finally {
      lock.current = false;
      setBusy("");
    }
  }
  async function generate(retry = false) {
    await run(
      retry ? "Finding a different angle…" : "Finding the funny…",
      async () => {
        if (retry && entry) {
          await post("/api/ratings", { generationId: entry.id, value: 0 });
          setRating(0);
          setStatus("Zero rating saved. Finding a different angle…");
        }
        if (!requestId.current) requestId.current = crypto.randomUUID();
        const data = await post("/api/generate", {
          requestId: requestId.current,
          category,
          story,
          ...(retry && entry ? { retryOf: entry.id } : {}),
        });
        setEntry(data.entry);
        setStory(data.entry.wt_stories.body);
        setRating(null);
        requestId.current = "";
        setStatus("Your new joke is saved privately.");
        router.replace(
          `/categories/${category}/create?generation=${data.entry.id}`,
          { scroll: false },
        );
      },
    );
  }
  async function rate(n: number) {
    if (!entry) return;
    await run("Saving your rating…", async () => {
      await post("/api/ratings", { generationId: entry.id, value: n });
      setRating(n);
      setStatus("Rating saved. Thanks for keeping us honest.");
    });
  }
  function startNew() {
    setEntry(null);
    setStory("");
    setRating(null);
    setError("");
    setStatus("");
    requestId.current = "";
    router.replace(`/categories/${category}/create?fresh=1`, { scroll: false });
  }
  return (
    <>
      <h1 className="experience-title">
        So… what happened <em>to you?</em>
      </h1>
      <div className="journal-layout">
        <section className={`paper journal ${entry ? "has-entry" : ""}`}>
          <div className="paper-heading">
            <span>DEAR DIARY,</span>
          </div>
          {entry ? (
            <>
              <div className="journal-result">
                <div className="journal-entry">
                  <p className="written-story" aria-label="Your original story">
                    {entry.wt_stories.body}
                  </p>
                  <div className="joke-note result">
                    <span className="note-label">
                      A little comic relief · AI-generated
                    </span>
                    <p>{entry.joke}</p>
                  </div>
                </div>
                <div className="journal-actions">
                  <Ratings
                    disabled={!!busy || rating !== null}
                    onRate={rate}
                    value={rating}
                  />
                  {rating !== null && (
                    <p className="saved-rating">Saved rating: {rating}/5</p>
                  )}
                  <button
                    className="zero"
                    disabled={!!busy || (rating !== null && rating !== 0)}
                    onClick={() => generate(true)}
                  >
                    0 — Try a completely new joke
                  </button>
                  <div className="sharing">
                    <p>
                      {entry.is_public
                        ? "This story and this joke are visible to everyone."
                        : "Only you can see this story and joke. Sharing makes both visible to other visitors."}
                    </p>
                    <button
                      disabled={!!busy}
                      onClick={() =>
                        run("Saving sharing choice…", async () => {
                          await post("/api/share", {
                            generationId: entry.id,
                            shared: !entry.is_public,
                          });
                          setEntry({ ...entry, is_public: !entry.is_public });
                          setStatus(
                            entry.is_public
                              ? "This version is private again."
                              : "Your story and joke are now in the public collection.",
                          );
                          router.refresh();
                        })
                      }
                    >
                      {entry.is_public
                        ? "Make this version private"
                        : "Share story & joke publicly"}
                    </button>
                  </div>
                  <button
                    className="text-button new-story"
                    disabled={!!busy}
                    onClick={startNew}
                  >
                    Start a new story ↗
                  </button>
                </div>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generate();
              }}
            >
              <label className="sr-only" htmlFor="story">
                Your story
              </label>
              <textarea
                className="journal-input"
                id="story"
                minLength={15}
                maxLength={3000}
                required
                value={story}
                disabled={!!busy}
                placeholder="Well, it all started when…"
                onChange={(e) => {
                  setStory(e.target.value);
                  requestId.current = "";
                }}
              />
              <div className="input-footer">
                <span>{story.length.toLocaleString()} / 3,000</span>
                <span>Private unless you share</span>
              </div>
              <button
                className="primary"
                disabled={!!busy || story.trim().length < 15}
                type="submit"
              >
                {busy || "Make it funny"} <span aria-hidden="true">✳</span>
              </button>
              <p className="tiny">
                Your story is sent to Google Gemini. Google may use free-tier
                content to improve its products. Leave out private details.
              </p>
            </form>
          )}
          {busy && entry && (
            <p role="status" className="notice">
              {busy}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <p className="status" aria-live="polite">
            {status}
          </p>
        </section>
        <aside className="inspiration">
          <details
            ref={(element) => {
              if (element)
                element.open = window.matchMedia("(min-width: 761px)").matches;
            }}
          >
            <summary>
              A few other plot twists <span>↙</span>
            </summary>
            {inspirationError ? (
              <p className="notice">
                These pages couldn’t load. You can still write your own.
              </p>
            ) : inspiration.length ? (
              inspiration.map((e) => <EntryCard key={e.id} entry={e} />)
            ) : (
              <p className="notice">
                No public pages here yet. Your story can be the first.
              </p>
            )}
          </details>
        </aside>
      </div>
    </>
  );
}
