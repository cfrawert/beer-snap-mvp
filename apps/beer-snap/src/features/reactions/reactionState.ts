import type { Post, ReactionType } from "@beer-snap/domain";

type ReactionValue = ReactionType | null;

const reactionScore = (reaction: ReactionValue) => {
  if (reaction === "like") return 1;
  if (reaction === "dislike") return -1;
  return 0;
};

export const getNextReaction = (
  previousReaction: ReactionValue,
  tappedReaction: ReactionType
) => (previousReaction === tappedReaction ? null : tappedReaction);

export const applyReactionToPost = <T extends Post>(
  post: T,
  previousReaction: ReactionValue,
  nextReaction: ReactionValue
): T => {
  const likeDelta =
    (nextReaction === "like" ? 1 : 0) - (previousReaction === "like" ? 1 : 0);
  const dislikeDelta =
    (nextReaction === "dislike" ? 1 : 0) -
    (previousReaction === "dislike" ? 1 : 0);
  const scoreDelta =
    reactionScore(nextReaction) - reactionScore(previousReaction);

  return {
    ...post,
    likeCount: Math.max(post.likeCount + likeDelta, 0),
    dislikeCount: Math.max(post.dislikeCount + dislikeDelta, 0),
    score: post.score + scoreDelta
  };
};
