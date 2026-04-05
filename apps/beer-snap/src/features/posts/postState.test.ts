import test from "node:test";
import assert from "node:assert/strict";
import type { FeedPost } from "@beer-snap/data";
import { removePostsByAuthor, updateFeedPost } from "./postState";

const makePost = (
  id: string,
  userId: string,
  likeCount: number,
  dislikeCount: number,
  score: number
): FeedPost => ({
  id,
  userId,
  imagePath: `posts/${id}.jpg`,
  imageWidth: 1080,
  imageHeight: 1350,
  createdAt: new Date().toISOString(),
  deletedAt: null,
  visibility: "public",
  moderationStatus: "approved",
  likeCount,
  dislikeCount,
  score,
  user: {
    id: userId,
    handle: `${userId}-handle`,
    displayName: `${userId} display`,
    avatarUrl: null,
    bio: null,
    createdAt: new Date().toISOString(),
    status: "active",
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  }
});

test("updateFeedPost only changes the targeted post", () => {
  const posts = [
    makePost("post-1", "user-1", 1, 0, 1),
    makePost("post-2", "user-2", 2, 1, 1)
  ];

  const next = updateFeedPost(posts, "post-2", null, "like");

  assert.equal(next[0]!.likeCount, 1);
  assert.equal(next[1]!.likeCount, 3);
  assert.equal(next[1]!.score, 2);
});

test("removePostsByAuthor strips every post from the unfollowed user", () => {
  const posts = [
    makePost("post-1", "user-1", 1, 0, 1),
    makePost("post-2", "user-2", 2, 1, 1),
    makePost("post-3", "user-1", 4, 0, 4)
  ];

  const next = removePostsByAuthor(posts, "user-1");

  assert.deepEqual(
    next.map((post) => post.id),
    ["post-2"]
  );
});
