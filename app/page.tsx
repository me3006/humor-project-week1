import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("*");

  if (error) {
    return <div>Error loading jokes: {error.message}</div>;
  }

  return (
    <main>
      <h1>Humor Project</h1>

      <ol style={{ listStyleType: "decimal", paddingLeft: "40px" }}>
        {jokes?.map((joke) => (
          <li key={joke.id}>
            <p>{joke.joke}</p>
            <p>Category: {joke.category}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}