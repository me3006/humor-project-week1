import { admin, failure, sameOrigin, session, uuid } from "@/lib/server";
import { categoryFor, entryColumns } from "@/lib/categories";
import { loggedGenerate } from "@/lib/logged-ai.mjs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return failure(new Error("Request not allowed."), 403);
  const { db, user } = await session();
  if (!db || !user)
    return failure(new Error("Please sign in to generate a joke."), 401);
  try {
    const body = await request.json();
    if (!uuid(body.requestId))
      throw new Error("Invalid request. Please reload and try again.");
    const service = admin();
    let story = typeof body.story === "string" ? body.story.trim() : "";
    let category = categoryFor(body.category);
    let storyId: string | null = null;
    let previous: string[] = [];
    const retryOf = body.retryOf;
    if (retryOf) {
      if (!uuid(retryOf)) throw new Error("Invalid joke.");
      const { data: old, error } = await db
        .from("wt_generations")
        .select("id, story_id, wt_stories!inner(body, category, user_id)")
        .eq("id", retryOf)
        .single();
      const original = old?.wt_stories as unknown as
        { body: string; category: string; user_id: string } | undefined;
      if (error || !original || original.user_id !== user.id)
        return failure(new Error("That story is not yours."), 403);
      const { data: rating } = await db
        .from("wt_ratings")
        .select("value")
        .eq("user_id", user.id)
        .eq("generation_id", retryOf)
        .single();
      if (rating?.value !== 0)
        throw new Error("Save a zero rating before trying a new joke.");
      storyId = old!.story_id;
      story = original.body;
      category = categoryFor(original.category);
      const { data: history, error: historyError } = await db
        .from("wt_generations")
        .select("joke")
        .eq("story_id", storyId)
        .order("created_at");
      if (historyError)
        throw new Error("Could not load the earlier jokes. Please retry.");
      previous = (history || []).map((x) => x.joke);
    }
    if (!category || story.length < 15 || story.length > 3000)
      throw new Error(
        "Choose a category and write a story between 15 and 3,000 characters.",
      );
    let existingQuery = service
      .from("wt_generations")
      .select("id, wt_stories!inner(user_id)")
      .eq("wt_stories.user_id", user.id);
    existingQuery = retryOf
      ? existingQuery.eq("retry_of", retryOf)
      : existingQuery.eq("request_id", body.requestId);
    const { data: existing, error: existingError } =
      await existingQuery.maybeSingle();
    if (existingError)
      throw new Error(
        "The journal database is not ready. Please finish database setup.",
      );
    let id = existing?.id;
    if (!id) {
      const { count, error } = await service
        .from("wt_generations")
        .select("id, wt_stories!inner(user_id)", { count: "exact", head: true })
        .eq("wt_stories.user_id", user.id)
        .gte("created_at", new Date(Date.now() - 3600000).toISOString());
      if (error) throw new Error("Could not check generation availability.");
      if ((count || 0) >= 30)
        return failure(
          new Error(
            "You have reached 30 jokes this hour. Come back in a little while.",
          ),
          429,
        );
      const result = await loggedGenerate(
        service,
        body.requestId,
        category.name,
        story,
        previous,
        user.id,
      );
      const { data, error: saveError } = await service.rpc(
        "wt_save_generation",
        {
          p_user: user.id,
          p_category: category.slug,
          p_body: story,
          p_story: storyId,
          p_retry: retryOf || null,
          p_request: body.requestId,
          p_joke: result.joke,
          p_prompt: result.prompt,
          p_model: result.model,
          p_provider_id: result.provider_id,
        },
      );
      if (saveError || !data)
        throw new Error(
          "The joke could not be saved. Retry with the same story; no successful save is being shown.",
        );
      id = data;
    }
    const { data: entry, error: readError } = await db
      .from("wt_generations")
      .select(entryColumns)
      .eq("id", id)
      .single();
    if (readError || !entry)
      throw new Error("Could not load the saved joke. Please retry.");
    return Response.json({ entry });
  } catch (e) {
    return failure(e);
  }
}
