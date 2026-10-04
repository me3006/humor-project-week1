import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import LoginButton from "./login-button";
import LogoutButton from "./logout-button";
import ProfileForm from "./profile-form";

export default async function Home() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jokes, error } = await supabase
    .from("jokes")
    .select("*");

  if (error) {
    return <div>Error loading jokes: {error.message}</div>;
  }

  let profile = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .single();

    profile = data;
  }

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          marginBottom: "32px",
        }}
      >
        Humor Project
      </h1>

      {!user && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <LoginButton />
        </div>
      )}

      {user && (
        <>
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <Link href="/members">Go to Members Only page</Link>
          </div>

          <section
            style={{
              marginBottom: "44px",
            }}
          >
            {profile?.avatar_url && (
              <div style={{ marginBottom: "16px" }}>
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  width={140}
                  height={140}
                  style={{
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                />
              </div>
            )}

            <ProfileForm
              userId={user.id}
              initialFirstName={profile?.first_name || ""}
              initialLastName={profile?.last_name || ""}
            />
          </section>
        </>
      )}

      <section
        style={{
          marginTop: "36px",
          marginBottom: "50px",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Jokes</h2>

        <ol
          style={{
            listStyleType: "decimal",
            paddingLeft: "32px",
          }}
        >
          {jokes.map((joke) => (
            <li
              key={joke.id}
              style={{
                marginBottom: "20px",
              }}
            >
              <p style={{ marginBottom: "6px" }}>{joke.joke}</p>
              <p>Category: {joke.category}</p>
            </li>
          ))}
        </ol>
      </section>

      {user && (
        <div
          style={{
            marginTop: "50px",
            paddingTop: "20px",
            borderTop: "1px solid #ccc",
            textAlign: "center",
          }}
        >
          <LogoutButton />
        </div>
      )}
    </main>
  );
}