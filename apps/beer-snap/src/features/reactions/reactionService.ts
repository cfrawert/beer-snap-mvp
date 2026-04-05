import { clearReaction, upsertReaction } from "@beer-snap/data";
import type { SupabaseClient } from "@beer-snap/data";
import type { ReactionType } from "@beer-snap/domain";

export const setReaction = async (
  supabase: SupabaseClient,
  {
    postId,
    userId,
    reaction
  }: {
    postId: string;
    userId: string;
    reaction: "like" | "dislike";
  }
) => {
  return upsertReaction(supabase, { postId, userId, reaction });
};

export const removeReaction = async (
  supabase: SupabaseClient,
  { postId, userId }: { postId: string; userId: string }
) => {
  return clearReaction(supabase, { postId, userId });
};

export const persistReaction = async (
  supabase: SupabaseClient,
  {
    postId,
    userId,
    reaction
  }: {
    postId: string;
    userId: string;
    reaction: ReactionType | null;
  }
) => {
  if (reaction) {
    return setReaction(supabase, { postId, userId, reaction });
  }

  return removeReaction(supabase, { postId, userId });
};
