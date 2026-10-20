begin;
-- Separate names preserve Assignment 3's existing jokes and profiles data.
create table public.wt_stories (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
 category text not null check (category in ('dating','friendship-drama','cooking-disasters','late-again','work','student-life','something-else')),
 body text not null check (char_length(body) between 15 and 3000),
 is_public boolean not null default false, seed_key text unique,
 created_at timestamptz not null default now(),
 check ((user_id is not null and seed_key is null) or (user_id is null and seed_key is not null))
);
create table public.wt_generations (
 id uuid primary key default gen_random_uuid(), story_id uuid not null references public.wt_stories(id) on delete cascade,
 joke text not null check (char_length(joke) between 1 and 1200), is_public boolean not null default false,
 request_id uuid not null unique, retry_of uuid unique references public.wt_generations(id),
 model text not null, provider_id text, created_at timestamptz not null default now()
);
create table public.wt_prompts (
 generation_id uuid primary key references public.wt_generations(id) on delete cascade,
 payload jsonb not null, created_at timestamptz not null default now()
);
create table public.wt_ratings (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 generation_id uuid not null references public.wt_generations(id) on delete cascade,
 value smallint not null check (value between 0 and 5), created_at timestamptz not null default now(),
 unique(user_id, generation_id)
);
create index on public.wt_stories(category, created_at);
create index on public.wt_stories(user_id);
create index on public.wt_generations(story_id);
create index on public.wt_generations(created_at);
create index on public.wt_ratings(generation_id);
alter table public.wt_stories enable row level security;
alter table public.wt_generations enable row level security;
alter table public.wt_prompts enable row level security;
alter table public.wt_ratings enable row level security;
revoke all on public.wt_stories, public.wt_generations, public.wt_prompts, public.wt_ratings from anon, authenticated;
grant select on public.wt_stories, public.wt_generations to anon, authenticated;
grant select on public.wt_prompts, public.wt_ratings to authenticated;
grant insert(user_id, generation_id, value) on public.wt_ratings to authenticated;
grant all on public.wt_stories, public.wt_generations, public.wt_prompts, public.wt_ratings to service_role;
create policy stories_read on public.wt_stories for select using (is_public or user_id = (select auth.uid()));
create policy generations_read on public.wt_generations for select using (
 is_public or exists (select 1 from public.wt_stories s where s.id = story_id and s.user_id = (select auth.uid()))
);
create policy prompts_owner on public.wt_prompts for select to authenticated using (
 exists (select 1 from public.wt_generations g join public.wt_stories s on s.id = g.story_id where g.id = generation_id and s.user_id = (select auth.uid()))
);
create policy ratings_owner on public.wt_ratings for select to authenticated using (user_id = (select auth.uid()));
create policy ratings_insert on public.wt_ratings for insert to authenticated with check (
 user_id = (select auth.uid()) and exists (select 1 from public.wt_generations g where g.id = generation_id)
);
-- Atomic publishing; only the chosen version is shared. Other versions stay private.
create function public.wt_set_sharing(p_generation uuid, p_shared boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_story uuid;
begin
 select s.id into v_story from public.wt_generations g join public.wt_stories s on s.id=g.story_id
 where g.id=p_generation and s.user_id=auth.uid() for update of s;
 if v_story is null then raise exception 'Not your generation'; end if;
 update public.wt_generations set is_public=p_shared where id=p_generation;
 update public.wt_stories set is_public=exists(select 1 from public.wt_generations where story_id=v_story and is_public) where id=v_story;
 return true;
end; $$;
revoke all on function public.wt_set_sharing(uuid,boolean) from public, anon;
grant execute on function public.wt_set_sharing(uuid,boolean) to authenticated;
-- Server-only atomic persistence: no partially saved story, generation, or prompt.
create function public.wt_save_generation(p_user uuid, p_category text, p_body text, p_story uuid, p_retry uuid, p_request uuid, p_joke text, p_prompt jsonb, p_model text, p_provider_id text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_story uuid; v_id uuid; v_owner uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(coalesce(p_retry,p_request)::text,0));
 select g.id, s.user_id into v_id,v_owner from public.wt_generations g join public.wt_stories s on s.id=g.story_id
 where g.request_id=p_request or (p_retry is not null and g.retry_of=p_retry);
 if v_id is not null then
   if v_owner is distinct from p_user then raise exception 'Request belongs to another user'; end if;
   return v_id;
 end if;
 if p_retry is not null then
   select s.id into v_story from public.wt_stories s join public.wt_generations g on g.story_id=s.id
   join public.wt_ratings r on r.generation_id=g.id and r.user_id=p_user and r.value=0
   where g.id=p_retry and s.id=p_story and s.user_id=p_user and s.body=p_body and s.category=p_category;
   if v_story is null then raise exception 'Invalid regeneration'; end if;
 else
   if p_story is not null then raise exception 'Unexpected story reference'; end if;
   insert into public.wt_stories(user_id,category,body) values(p_user,p_category,p_body) returning id into v_story;
 end if;
 insert into public.wt_generations(story_id,joke,request_id,retry_of,model,provider_id)
 values(v_story,p_joke,p_request,p_retry,p_model,p_provider_id) returning id into v_id;
 insert into public.wt_prompts(generation_id,payload) values(v_id,p_prompt);
 return v_id;
end; $$;
revoke all on function public.wt_save_generation(uuid,text,text,uuid,uuid,uuid,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.wt_save_generation(uuid,text,text,uuid,uuid,uuid,text,jsonb,text,text) to service_role;
-- Atomic, repeatable seed insertion. Null user + seed_key clearly identifies fiction.
create function public.wt_seed_entry(p_key text, p_category text, p_body text, p_joke text, p_prompt jsonb, p_model text, p_provider_id text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_story uuid; v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select id into v_story from public.wt_stories where seed_key=p_key;
 if v_story is not null then return v_story; end if;
 insert into public.wt_stories(category,body,is_public,seed_key) values(p_category,p_body,true,p_key) returning id into v_story;
 insert into public.wt_generations(story_id,joke,is_public,request_id,model,provider_id)
 values(v_story,p_joke,true,gen_random_uuid(),p_model,p_provider_id) returning id into v_id;
 insert into public.wt_prompts(generation_id,payload) values(v_id,p_prompt);
 return v_story;
end; $$;
revoke all on function public.wt_seed_entry(text,text,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.wt_seed_entry(text,text,text,text,jsonb,text,text) to service_role;
-- Replace potentially permissive profile policies with owner-only policies.
-- Keep the existing table, auth trigger, avatar storage, and profile data.
do $$ declare p record; begin
 if to_regclass('public.profiles') is not null then
  alter table public.profiles enable row level security;
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
   execute format('drop policy %I on public.profiles',p.policyname);
  end loop;
  revoke all on public.profiles from anon, authenticated;
  grant select on public.profiles to authenticated;
  grant update(first_name,last_name,avatar_url) on public.profiles to authenticated;
  create policy profile_read_own on public.profiles for select to authenticated using(id=auth.uid());
  create policy profile_update_own on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
 end if;
end $$;
-- Legacy jokes remain readable; no client writes are needed by either app version.
do $$ declare p record; begin
 if to_regclass('public.jokes') is not null then
  alter table public.jokes enable row level security;
  for p in select policyname from pg_policies where schemaname='public' and tablename='jokes' loop
   execute format('drop policy %I on public.jokes',p.policyname);
  end loop;
  revoke all on public.jokes from anon, authenticated;
  grant select on public.jokes to anon, authenticated;
  create policy legacy_jokes_read on public.jokes for select using(true);
 end if;
end $$;

-- Query the next genuinely unrated entry in SQL, without a client-side pagination cap.
create function public.wt_next_entry(p_category text) returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('id',g.id,'story_id',s.id,'joke',g.joke,'is_public',g.is_public,'created_at',g.created_at,
 'wt_stories',jsonb_build_object('body',s.body,'category',s.category,'seed_key',s.seed_key))
 from public.wt_generations g join public.wt_stories s on s.id=g.story_id
 where auth.uid() is not null and g.is_public and s.category=p_category
 and not exists (select 1 from public.wt_ratings r where r.generation_id=g.id and r.user_id=auth.uid())
 order by g.created_at,g.id limit 1;
$$;
revoke all on function public.wt_next_entry(text) from public, anon;
grant execute on function public.wt_next_entry(text) to authenticated;

commit;
