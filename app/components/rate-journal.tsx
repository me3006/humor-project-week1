"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Entry } from "@/lib/categories";
import EntryCard from "./entry-card";
import Ratings from "./ratings";
import { post } from "./create-journal";
export default function RateJournal({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  async function rate(value: number) {
    if (lock.current || saved) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await post("/api/ratings", { generationId: entry.id, value });
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <section className={`paper rating-journal ${saved ? "turning" : ""}`}>
      <EntryCard entry={entry} />
      <Ratings disabled={busy || pending || saved} onRate={rate} />
      <button
        className="zero"
        disabled={busy || pending || saved}
        onClick={() => rate(0)}
      >
        0 — Not funny
      </button>
      {(busy || pending || saved) && (
        <p role="status">
          {saved ? "Rating saved. Turning the page…" : "Saving your rating…"}
        </p>
      )}
      {saved && !pending && (
        <button onClick={() => router.refresh()}>Load next entry</button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
