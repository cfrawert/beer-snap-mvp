import test from "node:test";
import assert from "node:assert/strict";
import type { AppNotification } from "@beer-snap/domain";
import { getNotificationHref } from "./notificationNavigation";

const baseNotification: AppNotification = {
  id: "n1",
  recipientUserId: "u1",
  actorUserId: "u2",
  actorHandle: "maya",
  actorDisplayName: "Maya",
  type: "follow",
  postId: null,
  createdAt: new Date().toISOString(),
  readAt: null
};

test("routes post notifications to the post detail screen", () => {
  assert.equal(
    getNotificationHref({ ...baseNotification, type: "reaction", postId: "post-1" }),
    "/p/post-1"
  );
});

test("routes follow notifications to the actor profile when available", () => {
  assert.equal(getNotificationHref(baseNotification), "/u/maya");
});

test("returns null when a notification has no useful destination", () => {
  assert.equal(
    getNotificationHref({ ...baseNotification, actorHandle: null, type: "admin" }),
    null
  );
});
