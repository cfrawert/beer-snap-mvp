import type { FeedPost } from "@beer-snap/data";
import { applyReactionToPost } from "../reactions/reactionState";
import type { ReactionType } from "@beer-snap/domain";

export const updateFeedPost = (
  items: FeedPost[],
  postId: string,
  previousReaction: ReactionType | null,
  nextReaction: ReactionType | null
) =>
  items.map((item) =>
    item.id === postId
      ? applyReactionToPost(item, previousReaction, nextReaction)
      : item
  );

export const removePostsByAuthor = (items: FeedPost[], userId: string) =>
  items.filter((item) => item.user.id !== userId);
