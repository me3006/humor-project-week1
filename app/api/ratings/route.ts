import { failure, sameOrigin, session, uuid } from "@/lib/server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return failure(new Error("Request not allowed."), 403);
  const { db, user } = await session();
  if (!db || !user) return failure(new Error("Please sign in to rate."), 401);
  try {
    const { generationId, value } = await request.json();
    if (
      !uuid(generationId) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 5
    )
      throw new Error("Choose a rating from 0 to 5.");
    const { error } = await db
      .from("wt_ratings")
      .upsert(
        { generation_id: generationId, user_id: user.id, value },
        { onConflict: "user_id,generation_id", ignoreDuplicates: true },
      );
    if (error)
      throw new Error("Your rating could not be saved. Please try again.");
    const { data, error: readError } = await db
      .from("wt_ratings")
      .select("value")
      .eq("user_id", user.id)
      .eq("generation_id", generationId)
      .single();
    if (readError || !data)
      throw new Error("Could not confirm your rating. Please retry.");
    if (data.value !== value)
      return failure(
        new Error(`You already rated this joke ${data.value}.`),
        409,
      );
    return Response.json({ value: data.value });
  } catch (e) {
    return failure(e);
  }
}
