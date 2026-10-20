const definitions = [
  {
    slug: "dating",
    name: "Dating",
    emoji: "💔",
    hint: "A little romance. A little regret.",
  },
  {
    slug: "friendship-drama",
    name: "Friendship Drama",
    emoji: "💬",
    hint: "The group chat has entered the chat.",
  },
  {
    slug: "cooking-disasters",
    name: "Cooking Disasters",
    emoji: "🍳",
    hint: "It looked easier in the recipe.",
  },
  {
    slug: "late-again",
    name: "Late Again",
    emoji: "⏰",
    hint: "Five minutes away. Emotionally.",
  },
  {
    slug: "work",
    name: "Work",
    emoji: "💼",
    hint: "Per my last minor breakdown.",
  },
  {
    slug: "student-life",
    name: "Student Life",
    emoji: "📚",
    hint: "Learning things. Mostly the hard way.",
  },
  {
    slug: "roommate-life",
    name: "Roommate Life",
    emoji: "🏠",
    hint: "Shared space. Different definitions of clean.",
  },
  {
    slug: "something-else",
    name: "Something Else",
    emoji: "🫠",
    hint: "Life really went off-script.",
  },
];

// Keep the final pair together even when categories are added later.
export function orderCategories(items) {
  const position = (slug) =>
    slug === "something-else" ? 2 : slug === "roommate-life" ? 1 : 0;
  return [...items].sort((a, b) => position(a.slug) - position(b.slug));
}
export const categories = orderCategories(definitions);
