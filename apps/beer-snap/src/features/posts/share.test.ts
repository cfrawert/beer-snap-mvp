import test from "node:test";
import assert from "node:assert/strict";
import { getPostShareUrlForSite, getPostSharePath, normalizeSiteUrl } from "./shareUrl";

test("normalizes trailing slashes in site urls", () => {
  assert.equal(normalizeSiteUrl("https://beer.rawert.xyz/"), "https://beer.rawert.xyz");
});

test("builds a stable share path for posts", () => {
  assert.equal(getPostSharePath("post_123"), "/share/p/post_123");
});

test("builds a stable share url for posts", () => {
  assert.equal(
    getPostShareUrlForSite("https://beer.rawert.xyz/", "post_123"),
    "https://beer.rawert.xyz/share/p/post_123"
  );
});
