"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page">
      <h1>
        A little <em>plot twist.</em>
      </h1>
      <p role="alert">This page couldn’t load. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
