import { test } from "node:test";
import assert from "node:assert/strict";
import { loggedGenerate } from "../lib/logged-ai.mjs";
test("logging wrapper records exact configuration, output, sanitized failures and fails closed", async () => {
  const oldFetch = globalThis.fetch,
    oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-secret-never-stored";
  try {
    let calls = [];
    const db = {
      rpc: async (name, args) => {
        calls.push({ name, args });
        return { error: null };
      },
    };
    globalThis.fetch = async () =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "My spoon just joined the board." }] },
          },
        ],
        modelVersion: "test-model",
        responseId: "provider-test",
        usageMetadata: { totalTokenCount: 30 },
      });
    const result = await loggedGenerate(
      db,
      "request",
      "Work",
      "I brought a spoon to the office meeting.",
      [],
      "owner",
    );
    assert.equal(result.joke, "My spoon just joined the board.");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].name, "wt_begin_request");
    assert.equal(calls[0].args.p_user, "owner");
    assert.equal(
      JSON.parse(calls[0].args.p_configuration.input).story,
      "I brought a spoon to the office meeting.",
    );
    assert.equal(
      calls[1].args.p_payload.response.usageMetadata.totalTokenCount,
      30,
    );
    assert.ok(!JSON.stringify(calls).includes("test-secret-never-stored"));
    calls = [];
    globalThis.fetch = async () =>
      Response.json(
        { error: "do not log raw provider errors or headers" },
        { status: 429 },
      );
    await assert.rejects(
      loggedGenerate(
        db,
        "request",
        "Work",
        "I brought a spoon to the office meeting.",
      ),
      /quota/,
    );
    assert.equal(calls.length, 2);
    assert.equal(calls[1].args.p_payload, null);
    assert.match(calls[1].args.p_error, /quota/);
    assert.ok(!JSON.stringify(calls).includes("raw provider errors"));
    let requested = false;
    globalThis.fetch = async () => {
      requested = true;
      throw Error("should not run");
    };
    await assert.rejects(
      loggedGenerate(
        { rpc: async () => ({ error: { message: "offline" } }) },
        "request",
        "Work",
        "I brought a spoon to the office meeting.",
      ),
      /Could not start/,
    );
    assert.equal(requested, false);
    globalThis.fetch = async () =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: "My spoon just joined the board." }] },
          },
        ],
      });
    await assert.rejects(
      loggedGenerate(
        {
          rpc: async (name) => ({
            error: name === "wt_finish_request" ? {} : null,
          }),
        },
        "request",
        "Work",
        "I brought a spoon to the office meeting.",
      ),
      /Could not record/,
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
});
