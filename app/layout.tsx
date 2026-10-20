import type { Metadata } from "next";
import Link from "next/link";
import { session } from "@/lib/server";
import LogoutButton from "./logout-button";
import "./globals.css";
export const metadata: Metadata = {
  title: "Well, That Happened.",
  description:
    "Turn your awkward, frustrating, or just unlucky moments into something funny.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await session();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav aria-label="Main navigation">
            {user ? (
              <>
                <Link href="/members">My journal & profile</Link>
                <LogoutButton />
              </>
            ) : (
              <Link href="/login">Sign in</Link>
            )}
          </nav>
        </header>
        {children}
        <footer>
          A little perspective. A little punchline.{" "}
          <span>Well, That Happened.</span>
        </footer>
      </body>
    </html>
  );
}
