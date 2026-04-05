import test from "node:test";
import assert from "node:assert/strict";
import {
  getMagicLinkCooldownRemaining,
  mapMagicLinkError,
  normalizeMagicLinkEmail
} from "./magicLink";

test("normalizeMagicLinkEmail trims and lowercases email addresses", () => {
  assert.equal(
    normalizeMagicLinkEmail("  CleMens@Example.COM "),
    "clemens@example.com"
  );
});

test("getMagicLinkCooldownRemaining returns zero once cooldown expires", () => {
  assert.equal(getMagicLinkCooldownRemaining(Date.now() - 11_000, Date.now()), 0);
});

test("getMagicLinkCooldownRemaining reports remaining seconds", () => {
  assert.equal(getMagicLinkCooldownRemaining(1_000, 7_000), 4);
});

test("mapMagicLinkError turns Supabase rate limit errors into user-facing copy", () => {
  assert.equal(
    mapMagicLinkError(
      new Error("For security purposes, you can only request this after 60 seconds.")
    ),
    "We just sent a link. Wait a few seconds before requesting another one."
  );
});
