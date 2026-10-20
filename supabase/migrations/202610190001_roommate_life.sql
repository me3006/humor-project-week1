begin;
-- Expand the existing category constraint without deleting stories or ratings.
alter table public.wt_stories drop constraint if exists wt_stories_category_check;
alter table public.wt_stories add constraint wt_stories_category_check
check (category in (
 'dating', 'friendship-drama', 'cooking-disasters', 'late-again',
 'work', 'student-life', 'roommate-life', 'something-else'
));
-- Refresh PostgREST's schema metadata after dashboard-applied migrations.
notify pgrst, 'reload schema';
commit;
