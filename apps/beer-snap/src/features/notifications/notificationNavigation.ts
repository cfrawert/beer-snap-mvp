import type { AppNotification } from "@beer-snap/domain";

export const getNotificationHref = (notification: AppNotification) => {
  if (notification.postId) {
    return `/p/${notification.postId}`;
  }

  if (notification.type === "follow" && notification.actorHandle) {
    return `/u/${notification.actorHandle}`;
  }

  return null;
};
