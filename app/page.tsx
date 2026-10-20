import Link from "next/link";
import Room from "./components/room";
export default function Home() {
  return (
    <main className="home">
      <div className="home-copy">
        <h1>
          Well, That
          <br />
          <em>Happened.</em>
        </h1>
        <p className="intro">
          Turn your awkward, frustrating, or just unlucky moments into something
          funny.
        </p>
        <Link className="button primary" href="/categories">
          Come in <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <figure className="home-room">
        <Room />
        <figcaption>
          Take a seat. Tell us what happened. We’ll find the funny part.
        </figcaption>
      </figure>
    </main>
  );
}
