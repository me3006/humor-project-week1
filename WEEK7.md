# Week 7 public-app change

The existing admin sibling repository owns the canonical shared database migrations and detailed handoff in `../well-that-happened-admin/WEEK7.md`.

Apply its `supabase/migrations/202610220001_domain_model.sql`, then `202610220002_images.sql` in the EXISTING shared Supabase project BEFORE deploying the new generation logging code in either app. Do not run historical migrations again. No new environment variables or projects. The public server uses its existing Supabase service role for trusted activity logging, preserving ownership and exact prompt/output storage. New public profile-image choices validate common image MIME types and a 5 MB limit. Existing photos and name editing remain unchanged.
