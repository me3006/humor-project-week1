import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page">
      <h1>
        A wrong <em>turn.</em>
      </h1>
      <p>That page isn’t in this journal.</p>
      <Link className="button primary" href="/categories">
        Back to categories
      </Link>
    </main>
  );
}
