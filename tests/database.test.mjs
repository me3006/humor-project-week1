import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
test("migration, RLS, sharing, exact-version ratings and atomic idempotent regeneration", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public, auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role; create table public.profiles(id uuid primary key,first_name text,last_name text,avatar_url text); create table public.jokes(id uuid primary key,joke text); insert into auth.users values('${A}'),('${B}'); insert into public.profiles(id,first_name) values('${A}','A'),('${B}','B');`,
    );
    const migrationDir = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(migrationDir))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile(new URL(file, migrationDir), "utf8"));
    }
    const role = async (name, user = "") =>
      db.exec(
        `reset role; set role ${name}; select set_config('request.jwt.claim.sub','${user}',false);`,
      );
    const save = async (
      user,
      request,
      story = null,
      retry = null,
      joke = "My deadline has a better social life than I do.",
    ) =>
      (
        await db.query(
          `select public.wt_save_generation($1,'work','I forgot the deadline and brought my boss a cake instead.',$2,$3,$4,$5,'{"instructions":"private instructions","input":"private story"}','test-model','test-response') as id`,
          [user, story, retry, request, joke],
        )
      ).rows[0].id;
    await role("service_role");
    const request = "33333333-3333-4333-8333-333333333333";
    const gen = await save(A, request);
    assert.equal(await save(A, request), gen);
    await role("anon");
    assert.equal(
      (await db.query("select * from wt_generations")).rows.length,
      0,
    );
    assert.equal((await db.query("select * from wt_stories")).rows.length, 0);
    await assert.rejects(
      db.query("select * from wt_prompts"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select wt_save_generation(null,'work','story',null,null,gen_random_uuid(),'joke','{}','model',null)",
      ),
      /permission denied/,
    );
    await role("authenticated", B);
    assert.equal(
      (await db.query("select * from wt_generations")).rows.length,
      0,
    );
    assert.equal((await db.query("select * from wt_prompts")).rows.length, 0);
    assert.equal((await db.query("select * from profiles")).rows[0].id, B);
    await assert.rejects(
      db.query(
        "insert into wt_ratings(user_id,generation_id,value) values($1,$2,5)",
        [B, gen],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query("select wt_set_sharing($1,true)", [gen]),
      /Not your/,
    );
    await role("authenticated", A);
    const story = (await db.query("select * from wt_stories")).rows[0].id;
    assert.equal((await db.query("select * from wt_prompts")).rows.length, 1);
    await assert.rejects(
      db.query(
        "insert into wt_ratings(user_id,generation_id,value) values($1,$2,3)",
        [B, gen],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into wt_ratings(user_id,generation_id,value) values($1,$2,6)",
        [A, gen],
      ),
      /check constraint/,
    );
    await db.query(
      "insert into wt_ratings(user_id,generation_id,value) values($1,$2,0)",
      [A, gen],
    );
    await db.query(
      "insert into wt_ratings(user_id,generation_id,value) values($1,$2,0) on conflict(user_id,generation_id) do nothing",
      [A, gen],
    );
    assert.equal((await db.query("select * from wt_ratings")).rows.length, 1);
    await assert.rejects(
      db.query("update wt_ratings set value=5"),
      /permission denied/,
    );
    await role("service_role");
    const next = await save(
      A,
      "44444444-4444-4444-8444-444444444444",
      story,
      gen,
      "My boss now measures deadlines in cake slices.",
    );
    assert.notEqual(next, gen);
    assert.equal(
      await save(A, "55555555-5555-4555-8555-555555555555", story, gen),
      next,
    );
    await role("authenticated", A);
    assert.equal(
      (await db.query("select * from wt_generations")).rows.length,
      2,
    );
    await db.query("select wt_set_sharing($1,true)", [next]);
    await role("anon");
    assert.equal(
      (await db.query("select * from wt_generations")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from wt_generations")).rows[0].id,
      next,
    );
    assert.equal((await db.query("select * from wt_stories")).rows.length, 1);
    await role("authenticated", B);
    assert.equal((await db.query("select * from wt_prompts")).rows.length, 0);
    assert.equal((await db.query("select * from wt_ratings")).rows.length, 0);
    assert.equal(
      (await db.query("select wt_next_entry('work') as entry")).rows[0].entry
        .id,
      next,
    );
    await db.query(
      "insert into wt_ratings(user_id,generation_id,value) values($1,$2,0)",
      [B, next],
    );
    assert.equal(
      (await db.query("select wt_next_entry('work') as entry")).rows[0].entry,
      null,
    );
    assert.equal(
      (await db.query("select * from wt_generations")).rows.length,
      1,
    );
    await role("authenticated", A);
    await db.query(
      "insert into wt_ratings(user_id,generation_id,value) values($1,$2,5)",
      [A, next],
    );
    assert.equal((await db.query("select * from wt_ratings")).rows.length, 2);
    await db.query("select wt_set_sharing($1,false)", [next]);
    await role("anon");
    assert.equal((await db.query("select * from wt_stories")).rows.length, 0);
    await role("service_role");
    const seedArgs = [
      "test-seed",
      "dating",
      "I ordered three soups on my first date.",
      "My love language is apparently broth.",
      "{}",
      "test-model",
      "response",
    ];
    const sql = "select wt_seed_entry($1,$2,$3,$4,$5,$6,$7) as id";
    assert.equal(
      (await db.query(sql, seedArgs)).rows[0].id,
      (await db.query(sql, seedArgs)).rows[0].id,
    );
    assert.equal(
      (await db.query("select * from wt_stories where seed_key is not null"))
        .rows.length,
      1,
    );

    // The additive category migration supports private creation, public seeds,
    // publication, and rating without mixing categories or exposing prompts.
    const roomGeneration = (
      await db.query(
        "select wt_save_generation($1,'roommate-life',$2,null,null,gen_random_uuid(),$3,$4,'test-model','fixture-response') as id",
        [
          A,
          "I made a cleaning rota and my roommate used it as a coaster.",
          "Tuesday has a coffee ring.",
          JSON.stringify({
            instructions: "Test fixture instructions",
            input: "Roommate Life fixture story",
          }),
        ],
      )
    ).rows[0].id;
    const roomSeed = [
      "roommate-test-seed",
      "roommate-life",
      "I labeled my leftovers and my roommate ate them anyway.",
      "My name is apparently a serving suggestion.",
      "{}",
      "test-model",
      "test-response",
    ];
    await db.query(sql, roomSeed);
    await role("anon");
    assert.equal(
      (
        await db.query("select * from wt_generations where id=$1", [
          roomGeneration,
        ])
      ).rows.length,
      0,
    );
    const publicRoom = (
      await db.query(
        "select g.id from wt_generations g join wt_stories s on s.id=g.story_id where g.is_public and s.category='roommate-life'",
      )
    ).rows;
    assert.equal(publicRoom.length, 1);
    await role("authenticated", A);
    assert.equal(
      (
        await db.query("select * from wt_generations where id=$1", [
          roomGeneration,
        ])
      ).rows.length,
      1,
    );
    await db.query("select wt_set_sharing($1,true)", [roomGeneration]);
    await role("authenticated", B);
    for (let i = 0; i < 2; i++) {
      const entry = (
        await db.query("select wt_next_entry('roommate-life') as entry")
      ).rows[0].entry;
      assert.equal(entry.wt_stories.category, "roommate-life");
      await db.query(
        "insert into wt_ratings(user_id,generation_id,value) values($1,$2,$3)",
        [B, entry.id, i === 0 ? 0 : 5],
      );
    }
    assert.equal(
      (await db.query("select wt_next_entry('roommate-life') as entry")).rows[0]
        .entry,
      null,
    );
    assert.equal((await db.query("select * from wt_prompts")).rows.length, 0);
  } finally {
    await db.close();
  }
});
