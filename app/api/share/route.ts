import { failure, sameOrigin, session, uuid } from "@/lib/server";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return failure(new Error("Request not allowed."), 403);
  const { db, user } = await session();
  if (!db || !user)
    return failure(new Error("Please sign in to change sharing."), 401);
  try {
    const { generationId, shared } = await request.json();
    if (!uuid(generationId) || typeof shared !== "boolean")
      throw new Error("Invalid sharing request.");
    const { data, error } = await db.rpc("wt_set_sharing", {
      p_generation: generationId,
      p_shared: shared,
    });
    if (error || !data)
      throw new Error("Sharing could not be saved. Please try again.");
    return Response.json({ shared });
  } catch (e) {
    return failure(e);
  }
}
