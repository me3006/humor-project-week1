import { generateJoke, makePrompt } from "./ai.mjs";
/** @param {string | null} userId */
export async function loggedGenerate(
  db,
  requestId,
  category,
  story,
  previous = [],
  userId = null,
) {
  const start = await db.rpc("wt_begin_request", {
    p_id: requestId,
    p_category: category,
    p_story: story,
    p_user: userId,
    p_configuration: {
      provider: "gemini",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      ...makePrompt(category, story, previous),
    },
  });
  if (start.error)
    throw Error(
      "Could not start generation. Check database setup or wait for the current request to finish.",
    );
  let result;
  try {
    result = await generateJoke(category, story, previous);
  } catch (error) {
    const saved = await db.rpc("wt_finish_request", {
      p_id: requestId,
      p_user: userId,
      p_model: null,
      p_payload: null,
      p_error: error instanceof Error ? error.message : "AI request failed",
    });
    if (saved.error)
      throw Error(
        "Generation failed and its activity could not be recorded. Please try again later.",
      );
    throw error;
  }
  const finish = await db.rpc("wt_finish_request", {
    p_id: requestId,
    p_user: userId,
    p_model: result.model,
    p_payload: {
      joke: result.joke,
      provider_id: result.provider_id,
      prompt: result.prompt,
      response: result.response,
    },
    p_error: null,
  });
  if (finish.error)
    throw Error(
      "Could not record generation activity. No successful save is being shown.",
    );
  return result;
}
