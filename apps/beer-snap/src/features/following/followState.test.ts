import test from "node:test";
import assert from "node:assert/strict";
import { applyFollowingStatus } from "./followState";

test("applyFollowingStatus adds a missing followed id", () => {
  assert.deepEqual(applyFollowingStatus(["a"], "b", true), ["a", "b"]);
});

test("applyFollowingStatus avoids duplicates", () => {
  assert.deepEqual(applyFollowingStatus(["a", "b"], "b", true), ["a", "b"]);
});

test("applyFollowingStatus removes an unfollowed id", () => {
  assert.deepEqual(applyFollowingStatus(["a", "b"], "b", false), ["a"]);
});
