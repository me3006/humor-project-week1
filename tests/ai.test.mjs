import { test, after } from "node:test";
import assert from "node:assert/strict";
import { generateJoke, makePrompt } from "../lib/ai.mjs";
import { stories } from "../scripts/seed.mjs";
import { categories, orderCategories } from "../lib/category-catalog.mjs";
const previousEnv = Object.fromEntries(
  ["GEMINI_API_KEY", "GEMINI_MODEL", "OPENAI_API_KEY"].map((name) => [
    name,
    process.env[name],
  ]),
);
after(() => {
  for (const [name, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
test("24 fictional stories cover all eight categories, three each", () => {
  assert.equal(categories.length, 8);
  assert.deepEqual(
    Object.keys(stories),
    categories.map((c) => c.slug),
  );
  for (const entries of Object.values(stories)) {
    assert.equal(entries.length, 3);
    assert.equal(new Set(entries).size, 3);
  }
});
test("Roommate Life stays immediately before Something Else when categories are added", () => {
  const expanded = orderCategories([...categories, { slug: "another-topic" }]);
  assert.deepEqual(
    expanded.slice(-2).map((c) => c.slug),
    ["roommate-life", "something-else"],
  );
  assert.equal(expanded[expanded.length - 3].slug, "another-topic");
  assert.equal(categories.at(-1).slug, "something-else");
});
test("prompt contains exact story and category, with a distinct-angle retry instruction", () => {
  const prompt = makePrompt("Dating", "I ordered three soups.", ["Old joke."]);
  const input = JSON.parse(prompt.input);
  assert.equal(input.story, "I ordered three soups.");
  assert.equal(input.category, "Dating");
  assert.deepEqual(input.previous_jokes_to_avoid, ["Old joke."]);
  assert.match(input.direction, /substantially different/);
  assert.match(prompt.instructions, /untrusted/);
});
test("Gemini receives the exact story, instructions and previous versions; saved payload excludes the API key", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
  let body;
  const result = await generateJoke(
    "Roommate Life",
    "I labeled my leftovers and my roommate ate them.",
    ["An earlier joke."],
    async (url, options) => {
      assert.equal(
        url,
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      );
      assert.equal(options.headers["x-goog-api-key"], "test-gemini-key");
      assert.ok(!url.includes("test-gemini-key"));
      body = JSON.parse(options.body);
      return Response.json({
        modelVersion: "gemini-3.5-flash-lite",
        responseId: "test-response",
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                { text: "Private reasoning", thought: true },
                { text: "Apparently my name is a serving suggestion." },
              ],
            },
          },
        ],
      });
    },
  );
  assert.equal(
    body.systemInstruction.parts[0].text,
    result.prompt.instructions,
  );
  assert.equal(body.contents[0].parts[0].text, result.prompt.input);
  assert.deepEqual(result.prompt.request, body);
  const input = JSON.parse(result.prompt.input);
  assert.equal(input.story, "I labeled my leftovers and my roommate ate them.");
  assert.equal(input.category, "Roommate Life");
  assert.deepEqual(input.previous_jokes_to_avoid, ["An earlier joke."]);
  assert.equal(result.prompt.provider, "gemini");
  assert.ok(!JSON.stringify(result.prompt).includes("test-gemini-key"));
  assert.equal(result.joke, "Apparently my name is a serving suggestion.");
  assert.equal(result.provider_id, "test-response");
});
test("missing Gemini key never falls back to an existing paid OpenAI key", async () => {
  delete process.env.GEMINI_API_KEY;
  process.env.OPENAI_API_KEY = "must-not-use";
  let called = false;
  await assert.rejects(
    generateJoke("Work", "My story", [], async () => {
      called = true;
    }),
    /Add GEMINI_API_KEY/,
  );
  assert.equal(called, false);
});
test("Gemini quota failures stop after one request with no provider fallback", async () => {
  process.env.GEMINI_API_KEY = "test-only";
  let calls = 0;
  await assert.rejects(
    generateJoke("Work", "My story", [], async (url) => {
      calls++;
      assert.ok(url.startsWith("https://generativelanguage.googleapis.com/"));
      return Response.json(
        { error: { message: "provider detail must not be exposed" } },
        { status: 429 },
      );
    }),
    /quota is exhausted/,
  );
  assert.equal(calls, 1);
});
test("AI errors, blocked, incomplete, empty and repeated output never become a successful joke", async () => {
  process.env.GEMINI_API_KEY = "test-only";
  await assert.rejects(
    generateJoke(
      "Work",
      "My story",
      [],
      async () => new Response("", { status: 500 }),
    ),
    /could not generate/,
  );
  for (const data of [
    {
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "An unfinished joke" }] },
        },
      ],
    },
    { promptFeedback: { blockReason: "SAFETY" }, candidates: [] },
    {
      candidates: [
        {
          finishReason: "SAFETY",
          content: { parts: [{ text: "Blocked content" }] },
        },
      ],
    },
    { candidates: [] },
    {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: "Only thoughts", thought: true }] },
        },
      ],
    },
    {
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: "Same joke" }] } },
      ],
    },
  ])
    await assert.rejects(
      generateJoke("Work", "My story", ["Same joke"], async () =>
        Response.json(data),
      ),
      /complete, new joke/,
    );
  await assert.rejects(
    generateJoke("Work", "My story", [], async () => new Response("not JSON")),
    /unreadable response/,
  );
});
test("invalid Gemini model and rejected keys have actionable errors without secret exposure", async () => {
  process.env.GEMINI_API_KEY = "test-only";
  process.env.GEMINI_MODEL = "invalid/path";
  await assert.rejects(
    generateJoke("Work", "My story", [], async () => {
      assert.fail("must validate before transport");
    }),
    /model setting is invalid/,
  );
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
  await assert.rejects(
    generateJoke("Work", "My story", [], async () =>
      Response.json(
        { error: { message: "secret-provider-details" } },
        { status: 403 },
      ),
    ),
    /check the AI setup/,
  );
  await assert.rejects(
    generateJoke(
      "Work",
      "My story",
      [],
      async () => new Response("", { status: 404 }),
    ),
    /model is unavailable/,
  );
});
