# Well, That Happened.

Assignment 4 extends the existing Assignment 3 Next.js 16 / React / Supabase application. Google OAuth, profile names, and avatar uploads use the existing Supabase project. Hosting stays in the existing Vercel project.

The journey is **Room → Category → Create or Rate → Journal**. Home, categories, and public story/joke cards are public. The create, rating, and profile pages require a verified Supabase user. All mutation endpoints independently verify the user. Stories are private until explicitly shared; sharing applies to one joke version plus its story.

## First-time setup

1. Keep the existing `.env.local` values. Use `.env.example` as a list of variable names, **not** as a replacement for your working keys. Add:

   ```dotenv
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_google_ai_studio_key
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```

   In your **existing Supabase project → Project Settings → API Keys**, copy a server-side secret key (`sb_secret_...`) into `SUPABASE_SERVICE_ROLE_KEY`; the existing variable name is retained, and the legacy `service_role` key is also accepted. Never put it into a variable beginning with `NEXT_PUBLIC_`. Follow [FREE-AI-SETUP.md](FREE-AI-SETUP.md) to create a Gemini API key using a **Free tier** Google AI Studio project with billing disabled. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`. The application no longer reads OpenAI keys or falls back to a paid provider. Keys stay in `.env.local`, which is ignored by Git.

2. Follow [supabase/SETUP.md](supabase/SETUP.md) to apply the base schema and the Roommate Life migration in filename order. The live collection error was diagnosed as `PGRST205` (missing journal tables). Open **Supabase → SQL Editor → New query**. Paste the entire file `supabase/migrations/202610150001_journal.sql` and click **Run** once. The transaction creates four application tables and their RLS policies/functions. It keeps existing data, tables, the profile-creation trigger, and avatar storage. It tightens existing `profiles` access to the owner and keeps legacy `jokes` read-only. The migration expects the profile columns used by Assignment 3 (`id`, `first_name`, `last_name`, `avatar_url`). Review the policy changes if this database is shared by another application. With a configured Supabase CLI linked to this existing project, `supabase db push` is the alternative; use either method, not both without reconciling migration history.

3. From the repository directory, run:

   ```bash
   npm install
   npm run seed
   ```

   This makes **24 real AI requests**, one for each fictional story (three per category), and stores jokes and their actual prompts in Supabase. It uses your Gemini project's free-tier quota. The script spaces requests by 6.5 seconds to reduce bursts; quota limits may require rerunning later. A failed request stops the script and reports an error; rerun the same command to resume. Stable seed keys and an atomic seed function prevent duplicates, including concurrent runs. There are no fabricated people and no hard-coded fallback jokes. **The public collection remains empty until seeding succeeds.**

4. Run `npm run diagnose:database` to verify the site's exact category queries publicly load at least three matching cards for all eight categories. Then run `npm run test:integration`. This read-only live check verifies the category seed counts, saved seed prompts, public reads, and anonymous restrictions. It needs the service-role key locally; it does not write to your database.

5. Run `npm run dev`, then open `http://localhost:3000`. If this machine blocks Turbopack's internal process ports, use `npm run dev -- --webpack`. The production equivalent is `npm run build -- --webpack`.

## Google sign-in and profiles

Keep the existing Google provider configuration in **Supabase → Authentication → Sign In / Providers → Google**. The callback remains `/auth/callback`; it now safely carries the category and activity through sign-in. Errors return to the sign-in page rather than silently claiming success. A Next.js `proxy.ts` refreshes auth cookies; pages and API routes also verify authentication themselves.

In **Supabase → Authentication → URL Configuration**, keep the production Site URL and allow your local and deployed application URLs, including the callback query string. For example, allow `http://localhost:3000/**` for local development and `https://YOUR-EXACT-VERCEL-DEPLOYMENT.vercel.app/**` for the deployment being submitted. Use the exact deployment hostname. Do not change Google's authorized redirect URI away from the existing Supabase OAuth callback.

The **My journal & profile** link opens `/members`, with the existing name editing and avatar upload UI, plus saved joke versions. The existing `avatars` storage bucket and policies are not changed. If uploads already work, keep them. Check **Supabase → Storage → avatars → Policies** if needed: authenticated users should write only in their own user-ID folder; public avatar reading can remain enabled. Live Google consent and storage access must be checked in a browser with your account.

## Database and generation design

- `wt_stories`: category, story, authenticated owner (or a stable fictional seed key), sharing state.
- `wt_generations`: every exact joke version, story link, model, provider response ID, request ID, optional predecessor, sharing state.
- `wt_prompts`: exact `instructions`, `input`, provider, model, and full request payload sent to the AI, in a separately protected table. Only the owner can read their prompts. Seed prompts have no public access.
- `wt_ratings`: user, exact generation, and an integer score from 0–5. The database enforces one immutable rating per user per version. Repeating the same request is safe; choosing a different score for an already rated joke reports a conflict.

Browser database clients cannot insert arbitrary stories, fake AI generations, or seed data. The server first verifies the user's session, checks ownership, validates the category/story, and calls Google's [Gemini generateContent API](https://ai.google.dev/api/generate-content) on the server. Stories are sent to Google Gemini; the form explains that Google may use free-tier content to improve its products. The full request payload is saved without the authentication header. No keys enter client code. An atomic, server-only SQL function saves the story, joke, and actual prompt together. A failed request or save never becomes a fake successful joke. A rolling database query limits users to 30 saved jokes/hour (a practical guard, not a strict concurrent-request quota).

**Create zero:** save an idempotent zero rating first, then generate another angle using the original story, category, and previous jokes. A unique predecessor link and transactional lock allow only one replacement per version. If AI generation fails, the zero remains saved and retry does not duplicate it. The new version starts private and unrated; the previous version and its sharing/rating remain intact. A 1–5 rating is final for that version, so the zero button is disabled after one is saved. Start a new story at any time.

**Rate zero:** save a zero, then select the next existing unrated public entry in SQL. This path never calls AI. Once all available entries have been rated, an explicit caught-up state offers another category. Ratings and queue progress are database-backed and survive refresh.

**Sharing:** an owner-only SQL function updates the chosen generation and makes its story publicly readable while at least one version is shared. Unsharing the last public version hides the story again. Other joke versions and all prompts remain private. Users who already viewed shared content may retain it; making content private cannot recall copies already seen.

The original `jokes` table is retained for Assignment 3 compatibility but is not used as the new collection because it has no verified story/prompt linkage.

## Checks

```bash
npm test                     # AI request/error tests + real PostgreSQL-engine RLS tests
npm run lint
npx tsc --noEmit
npm run build -- --webpack   # production build; regular npm run build uses Turbopack
npm run start -- --port 3100
# In a second terminal:
npx playwright install chromium
npm run test:browser
```

The SQL tests use disposable PGlite PostgreSQL with Supabase-compatible auth roles and `auth.uid()`. They execute the real migration and test owner isolation, public/private responses, prompt isolation, rating ownership and range, duplicate rejection/idempotency, exact-version regeneration, seed repeatability, publishing/unpublishing, and queue exhaustion. They do not modify the live Supabase project. AI tests use a clearly mocked HTTP transport to inspect requests and failure handling; they do not establish live AI availability. Browser tests check public navigation, both sign-in continuations, desktop/mobile overflow, protected redirects, and anonymous API rejection.

After credentials and migration are ready, manually verify:

1. Sign in with Google from both activity choices and confirm the selected category/activity is restored. Edit your profile, upload an avatar, refresh, then sign out.
2. Generate a joke from a distinctive actual story. In Supabase Table Editor, confirm `wt_stories`, `wt_generations`, and the matching `wt_prompts` record. Refresh and reopen the saved page.
3. Choose zero. Confirm two generation rows reference the same story, the first has a zero rating, and the second is unrated. Temporarily use an invalid Gemini key to verify a failed retry keeps one zero rating and shows an error; restore the key afterward.
4. Share the new version. In a signed-out/incognito window open its category and confirm the story/joke is readable. Ensure the older private version and prompts are absent. Unshare and check again.
5. Sign in as a second user. Rate 1–5 and zero, refreshing between entries. Confirm rows use that second user's ID and the exact joke ID. Confirm zero in Rate creates no generation. Exhaust the category and switch categories.
6. Check Create and Rate at desktop and phone widths, keyboard focus, readable journal input, compact mobile inspiration, and reduced-motion behavior. Local browser coverage of protected journal screens needs an authenticated session and prepared database.

## Deploy using the existing Vercel project

1. In **your existing Vercel project → Settings → Environment Variables**, configure these for the environments you deploy to (Production and/or Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `GEMINI_API_KEY` (server only; use a Free tier project with billing disabled)
   - `GEMINI_MODEL` (optional; default `gemini-3.5-flash-lite`)
2. Apply the SQL and seed the same Supabase project first. Push through your existing Git/Vercel workflow and redeploy after changing environment variables. No new hosting project is needed.
3. Add the deployment hostname to Supabase's allowed redirect URLs as described above and test Google sign-in on that exact URL.
4. In **Vercel → Project Settings → Deployment Protection**, verify protection is **off** for the assignment deployment, so a signed-out reviewer can open public pages. Application sign-in still protects the journal and rating routes.
5. Submit the **deployment-specific URL** from that deployment's page, and verify it in incognito, rather than relying only on the moving production alias.

## Outstanding assignment item

No PM feedback was found in the repository or supplied brief. Implementing PM feedback remains outstanding until that feedback is provided; no feedback has been invented.

See `VERIFICATION.md` for what was actually checked during implementation and what still requires credentials.
