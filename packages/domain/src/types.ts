export type UUID = string;

export type UserStatus = "active" | "suspended" | "admin";

export type UserProfile = {
  id: UUID;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  status: UserStatus;
  postCount: number;
  followerCount: number;
  followingCount: number;
};

export type PostVisibility = "public";
export type ModerationStatus = "pending" | "approved" | "flagged" | "removed";

export type Post = {
  id: UUID;
  userId: UUID;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  createdAt: string;
  deletedAt: string | null;
  visibility: PostVisibility;
  moderationStatus: ModerationStatus;
  likeCount: number;
  dislikeCount: number;
  score: number;
};

export type ReactionType = "like" | "dislike";

export type PostReaction = {
  userId: UUID;
  postId: UUID;
  reaction: ReactionType;
  createdAt: string;
  updatedAt: string;
};

export type Follow = {
  followerUserId: UUID;
  followedUserId: UUID;
  createdAt: string;
};

export type NotificationType =
  | "follow"
  | "post"
  | "reaction"
  | "report"
  | "admin";

export type AppNotification = {
  id: UUID;
  recipientUserId: UUID;
  actorUserId: UUID;
  actorHandle?: string | null;
  actorDisplayName?: string | null;
  type: NotificationType;
  postId: UUID | null;
  createdAt: string;
  readAt: string | null;
};

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTargetType = "post" | "user";

export type Report = {
  id: UUID;
  reporterUserId: UUID;
  targetType: ReportTargetType;
  targetPostId: UUID | null;
  targetUserId: UUID | null;
  reasonCode: string;
  note: string | null;
  createdAt: string;
  status: ReportStatus;
};

export type AdminQueueState = "open" | "triaged" | "resolved";

export type AdminReviewQueueItem = {
  id: UUID;
  postId: UUID;
  source: string;
  priority: number;
  state: AdminQueueState;
  createdAt: string;
  resolvedAt: string | null;
};

export type PostReportSummary = Report & {
  reporterHandle: string | null;
  reporterDisplayName: string | null;
};

export type AdminReviewPostItem = AdminReviewQueueItem & {
  post: (Post & {
    user: Pick<UserProfile, "id" | "handle" | "displayName" | "status">;
  }) | null;
  reports: PostReportSummary[];
};

export type FeedSort = "latest" | "top24h";

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
