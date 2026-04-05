import test from "node:test";
import assert from "node:assert/strict";
import type { Post } from "@beer-snap/domain";
import { applyReactionToPost, getNextReaction } from "./reactionState";

const basePost: Post = {
  id: "post-1",
  userId: "user-1",
  imagePath: "posts/example.jpg",
  imageWidth: 1080,
  imageHeight: 1350,
  createdAt: new Date().toISOString(),
  deletedAt: null,
  visibility: "public",
  moderationStatus: "approved",
  likeCount: 4,
  dislikeCount: 1,
  score: 3
};

test("getNextReaction toggles the active reaction off", () => {
  assert.equal(getNextReaction("like", "like"), null);
  assert.equal(getNextReaction("dislike", "dislike"), null);
});

test("getNextReaction switches between reactions", () => {
  assert.equal(getNextReaction(null, "like"), "like");
  assert.equal(getNextReaction("like", "dislike"), "dislike");
});

test("applyReactionToPost updates counts and score when liking", () => {
  const updated = applyReactionToPost(basePost, null, "like");
  assert.equal(updated.likeCount, 5);
  assert.equal(updated.dislikeCount, 1);
  assert.equal(updated.score, 4);
});

test("applyReactionToPost swaps counts when moving from like to dislike", () => {
  const updated = applyReactionToPost(basePost, "like", "dislike");
  assert.equal(updated.likeCount, 3);
  assert.equal(updated.dislikeCount, 2);
  assert.equal(updated.score, 1);
});
