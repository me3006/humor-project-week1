# Use Gemini's free API tier

The application now uses Google Gemini rather than the separately billed OpenAI API. Existing OpenAI environment variables are ignored, and no automatic paid-provider fallback exists.

1. Open https://aistudio.google.com/apikey and sign in with Google.
2. Accept the terms if prompted. Create or select an AI Studio project and create an API key. A new account may already have a default project/key. **Confirm that the project says Free tier. Do not click Set up billing or link a billing account.** If an existing project is paid, create/select a separate free-tier project for this assignment.
3. Copy the key. In `.env.local`, find the empty line already prepared for you and paste the key after the equals sign:

   ```dotenv
   GEMINI_API_KEY=paste_your_google_ai_studio_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```

   Keep the existing Supabase variables. Old `OPENAI_API_KEY` / `OPENAI_MODEL` entries are no longer used by the application. Never prefix the Gemini key with `NEXT_PUBLIC_` and never paste it into chat, Git, or a SQL file.

4. Save `.env.local`. Reply “ready” in chat so the prepared seed runner can generate and save the 24 fictional initial entries and verify the real Supabase collection.

For running it yourself, restart the dev server after changing environment variables, then run `npm run seed`, `npm run diagnose:database`, and `npm run test:integration`. Seeding spaces requests by 6.5 seconds and resumes without duplicating entries. Free quotas vary by project; a quota error stops the process without fabricating output. Rerun after the quota becomes available.

For deployment, add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` to the **existing Vercel project → Settings → Environment Variables**, alongside the existing Supabase variables, then redeploy through the same workflow.

`gemini-3.5-flash-lite` is listed with free input/output on the Gemini API's Free tier. Account/region availability and quota must still be checked in your own project. The code cannot determine your Google project's billing status from an API key; keeping the project on Free tier is the control that avoids paid API usage. A free tier is limited, not an unlimited-usage guarantee.

Google states that free-tier content may be used to improve its products. The story form discloses this before submission. Use fictional or non-sensitive stories and omit private details.

Official sources checked October 20, 2026:

- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite
- https://ai.google.dev/gemini-api/docs/billing
