import type {
  AdminReviewPostItem,
  AppNotification,
  CursorPage,
  FeedSort,
  Post,
  PostReportSummary,
  ReactionType,
  UserProfile
} from "@beer-snap/domain";
import type { SupabaseClient } from "./supabaseClient";

const POST_FIELDS = [
  "id",
  "user_id",
  "image_path",
  "image_width",
  "image_height",
  "created_at",
  "deleted_at",
  "visibility",
  "moderation_status",
  "like_count_cache",
  "dislike_count_cache",
  "score_cache"
].join(",");

const USER_FIELDS = [
  "id",
  "handle",
  "display_name",
  "avatar_url",
  "bio",
  "created_at",
  "status",
  "post_count_cache",
  "follower_count_cache",
  "following_count_cache"
].join(",");

const NOTIFICATION_ACTOR_FIELDS = ["id", "handle", "display_name"].join(",");
const ADMIN_REPORTER_FIELDS = ["id", "handle", "display_name"].join(",");

// PostgREST sees two possible paths from posts -> users:
// the author foreign key and the many-to-many path through post_reactions.
// We want the direct author relationship for feed rows.
const POST_WITH_AUTHOR_FIELDS = `${POST_FIELDS}, user:users!posts_user_id_fkey(${USER_FIELDS})`;

export type FeedPost = Post & { user: UserProfile };

const encodeCursor = (parts: (string | number)[]) =>
  encodeURIComponent(parts.join("|"));

const decodeCursor = (cursor: string) =>
  decodeURIComponent(cursor).split("|");

const mapPost = (row: any): FeedPost => ({
  id: row.id,
  userId: row.user_id,
  imagePath: row.image_path,
  imageWidth: row.image_width,
  imageHeight: row.image_height,
  createdAt: row.created_at,
  deletedAt: row.deleted_at,
  visibility: row.visibility,
  moderationStatus: row.moderation_status,
  likeCount: row.like_count_cache,
  dislikeCount: row.dislike_count_cache,
  score: row.score_cache,
  user: {
    id: row.user.id,
    handle: row.user.handle,
    displayName: row.user.display_name,
    avatarUrl: row.user.avatar_url,
    bio: row.user.bio,
    createdAt: row.user.created_at,
    status: row.user.status,
    postCount: row.user.post_count_cache,
    followerCount: row.user.follower_count_cache,
    followingCount: row.user.following_count_cache
  }
});

export const fetchGlobalFeed = async (
  supabase: SupabaseClient,
  {
    sort,
    cursor,
    limit = 20
  }: { sort: FeedSort; cursor?: string | null; limit?: number }
): Promise<CursorPage<FeedPost>> => {
  let query = supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_FIELDS)
    .is("deleted_at", null)
    .eq("visibility", "public")
    .eq("moderation_status", "approved");

  if (sort === "top24h") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    );
  }

  if (sort === "latest") {
    query = query.order("created_at", { ascending: false }).order("id", {
      ascending: false
    });
    if (cursor) {
      const [createdAt, id] = decodeCursor(cursor);
      const orClause = `and(created_at.lt.${createdAt}),and(created_at.eq.${createdAt},id.lt.${id})`;
      query = query.or(orClause);
    }
  } else {
    query = query
      .order("score_cache", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (cursor) {
      const [score, createdAt, id] = decodeCursor(cursor);
      const orClause = `and(score_cache.lt.${score}),and(score_cache.eq.${score},created_at.lt.${createdAt}),and(score_cache.eq.${score},created_at.eq.${createdAt},id.lt.${id})`;
      query = query.or(orClause);
    }
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const items = (data ?? []).map(mapPost);
  const last = items[items.length - 1];
  const nextCursor = last
    ? sort === "latest"
      ? encodeCursor([last.createdAt, last.id])
      : encodeCursor([last.score, last.createdAt, last.id])
    : null;

  return { items, nextCursor };
};

export const fetchFollowingFeed = async (
  supabase: SupabaseClient,
  {
    userId,
    cursor,
    limit = 20
  }: { userId: string; cursor?: string | null; limit?: number }
): Promise<CursorPage<FeedPost>> => {
  const { data: followData, error: followError } = await supabase
    .from("follows")
    .select("followed_user_id")
    .eq("follower_user_id", userId);

  if (followError) throw followError;

  const followedIds = (followData ?? []).map((row) => row.followed_user_id);
  if (followedIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  let query = supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_FIELDS)
    .is("deleted_at", null)
    .eq("visibility", "public")
    .eq("moderation_status", "approved")
    .in("user_id", followedIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    const [createdAt, id] = decodeCursor(cursor);
    const orClause = `and(created_at.lt.${createdAt}),and(created_at.eq.${createdAt},id.lt.${id})`;
    query = query.or(orClause);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const items = (data ?? []).map(mapPost);
  const last = items[items.length - 1];
  const nextCursor = last ? encodeCursor([last.createdAt, last.id]) : null;

  return { items, nextCursor };
};

export const fetchPostById = async (
  supabase: SupabaseClient,
  postId: string
): Promise<FeedPost | null> => {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_WITH_AUTHOR_FIELDS)
    .eq("id", postId)
    .is("deleted_at", null)
    .eq("visibility", "public")
    .eq("moderation_status", "approved")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapPost(data);
};

export const fetchUserProfile = async (
  supabase: SupabaseClient,
  handle: string
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .eq("handle", handle)
    .maybeSingle();
  const row = data as Record<string, any> | null;

  if (error) throw error;
  if (!row) return null;

  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
    status: row.status,
    postCount: row.post_count_cache,
    followerCount: row.follower_count_cache,
    followingCount: row.following_count_cache
  };
};

export const fetchUserPosts = async (
  supabase: SupabaseClient,
  userId: string,
  cursor?: string | null,
  limit = 20
): Promise<CursorPage<Post>> => {
  let query = supabase
    .from("posts")
    .select(POST_FIELDS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    const [createdAt, id] = decodeCursor(cursor);
    const orClause = `and(created_at.lt.${createdAt}),and(created_at.eq.${createdAt},id.lt.${id})`;
    query = query.or(orClause);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;

  const items: Post[] = ((data ?? []) as Record<string, any>[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    imagePath: row.image_path,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    visibility: row.visibility,
    moderationStatus: row.moderation_status,
    likeCount: row.like_count_cache,
    dislikeCount: row.dislike_count_cache,
    score: row.score_cache
  }));

  const last = items[items.length - 1];
  const nextCursor = last ? encodeCursor([last.createdAt, last.id]) : null;

  return { items, nextCursor };
};

export const updateUserProfile = async (
  supabase: SupabaseClient,
  {
    userId,
    handle,
    displayName,
    bio
  }: {
    userId: string;
    handle: string;
    displayName: string;
    bio: string | null;
  }
): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("users")
    .update({
      handle,
      display_name: displayName,
      bio
    })
    .eq("id", userId)
    .select(USER_FIELDS)
    .single();
  const row = data as Record<string, any>;

  if (error) throw error;

  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
    status: row.status,
    postCount: row.post_count_cache,
    followerCount: row.follower_count_cache,
    followingCount: row.following_count_cache
  };
};

export const createPost = async (
  supabase: SupabaseClient,
  {
    userId,
    imagePath,
    imageWidth,
    imageHeight
  }: {
    userId: string;
    imagePath: string;
    imageWidth: number;
    imageHeight: number;
  }
) => {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      image_path: imagePath,
      image_width: imageWidth,
      image_height: imageHeight,
      visibility: "public"
    })
    .select(POST_FIELDS)
    .single();

  if (error) throw error;
  return data;
};

export const deletePost = async (
  supabase: SupabaseClient,
  postId: string
) => {
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) throw error;
};

export const deleteUserPost = async (
  supabase: SupabaseClient,
  {
    postId,
    userId
  }: {
    postId: string;
    userId: string;
  }
) => {
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("user_id", userId);

  if (error) throw error;
};

export const upsertReaction = async (
  supabase: SupabaseClient,
  {
    postId,
    userId,
    reaction
  }: {
    postId: string;
    userId: string;
    reaction: ReactionType;
  }
) => {
  const { data, error } = await supabase
    .from("post_reactions")
    .upsert({
      post_id: postId,
      user_id: userId,
      reaction
    })
    .select("reaction")
    .single();

  if (error) throw error;
  return data;
};

export const fetchUserReactions = async (
  supabase: SupabaseClient,
  {
    userId,
    postIds
  }: {
    userId: string;
    postIds: string[];
  }
) => {
  if (postIds.length === 0) {
    return {} as Record<string, ReactionType>;
  }

  const { data, error } = await supabase
    .from("post_reactions")
    .select("post_id, reaction")
    .eq("user_id", userId)
    .in("post_id", postIds);

  if (error) throw error;

  return (data ?? []).reduce<Record<string, ReactionType>>((acc, row) => {
    acc[row.post_id] = row.reaction;
    return acc;
  }, {});
};

export const clearReaction = async (
  supabase: SupabaseClient,
  {
    postId,
    userId
  }: {
    postId: string;
    userId: string;
  }
) => {
  const { error } = await supabase
    .from("post_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (error) throw error;
};

export const toggleFollow = async (
  supabase: SupabaseClient,
  {
    followerUserId,
    followedUserId,
    shouldFollow
  }: {
    followerUserId: string;
    followedUserId: string;
    shouldFollow: boolean;
  }
) => {
  if (shouldFollow) {
    const { error } = await supabase.from("follows").insert({
      follower_user_id: followerUserId,
      followed_user_id: followedUserId
    });
    if (error && error.code !== "23505") throw error;
    return;
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_user_id", followerUserId)
    .eq("followed_user_id", followedUserId);

  if (error) throw error;
};

export const fetchNotifications = async (
  supabase: SupabaseClient,
  recipientUserId: string
): Promise<AppNotification[]> => {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, recipient_user_id, actor_user_id, type, post_id, created_at, read_at, actor:users!notifications_actor_user_id_fkey(id, handle, display_name)")
    .eq("recipient_user_id", recipientUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;

    return {
      id: row.id,
      recipientUserId: row.recipient_user_id,
      actorUserId: row.actor_user_id,
      actorHandle: actor?.handle ?? null,
      actorDisplayName: actor?.display_name ?? null,
      type: row.type,
      postId: row.post_id,
      createdAt: row.created_at,
      readAt: row.read_at
    };
  });
};

export const markNotificationRead = async (
  supabase: SupabaseClient,
  notificationId: string
) => {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
};

export const reportPost = async (
  supabase: SupabaseClient,
  {
    reporterUserId,
    postId,
    reasonCode,
    note
  }: {
    reporterUserId: string;
    postId: string;
    reasonCode: string;
    note?: string | null;
  }
) => {
  const { error } = await supabase.from("reports").insert({
    reporter_user_id: reporterUserId,
    target_type: "post",
    target_post_id: postId,
    reason_code: reasonCode,
    note: note ?? null,
    status: "open"
  });

  if (error) throw error;
};

const mapReportSummary = (row: any): PostReportSummary => {
  const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter;

  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    targetType: row.target_type,
    targetPostId: row.target_post_id,
    targetUserId: row.target_user_id,
    reasonCode: row.reason_code,
    note: row.note,
    createdAt: row.created_at,
    status: row.status,
    reporterHandle: reporter?.handle ?? null,
    reporterDisplayName: reporter?.display_name ?? null
  };
};

export const fetchAdminReviewItems = async (
  supabase: SupabaseClient
): Promise<AdminReviewPostItem[]> => {
  const { data, error } = await supabase
    .from("admin_review_queue")
    .select(
      `id, post_id, source, priority, state, created_at, resolved_at,
      post:posts!admin_review_queue_post_id_fkey(
        ${POST_FIELDS},
        user:users!posts_user_id_fkey(id, handle, display_name, status),
        reports!reports_target_post_id_fkey(
          id, reporter_user_id, target_type, target_post_id, target_user_id, reason_code, note, created_at, status,
          reporter:users!reports_reporter_user_id_fkey(${ADMIN_REPORTER_FIELDS})
        )
      )`
    )
    .eq("state", "open")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const post = Array.isArray(row.post) ? row.post[0] : row.post;
    const reports = (post?.reports ?? []).map(mapReportSummary);

    return {
      id: row.id,
      postId: row.post_id,
      source: row.source,
      priority: row.priority,
      state: row.state,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      post: post
        ? {
            id: post.id,
            userId: post.user_id,
            imagePath: post.image_path,
            imageWidth: post.image_width,
            imageHeight: post.image_height,
            createdAt: post.created_at,
            deletedAt: post.deleted_at,
            visibility: post.visibility,
            moderationStatus: post.moderation_status,
            likeCount: post.like_count_cache,
            dislikeCount: post.dislike_count_cache,
            score: post.score_cache,
            user: {
              id: post.user.id,
              handle: post.user.handle,
              displayName: post.user.display_name,
              status: post.user.status
            }
          }
        : null,
      reports
    };
  });
};

export const adminApprovePost = async (
  supabase: SupabaseClient,
  postId: string
) => {
  const { error } = await supabase.rpc("admin_approve_post", {
    target_post_id: postId
  });

  if (error) throw error;
};

export const adminDeletePost = async (
  supabase: SupabaseClient,
  postId: string
) => {
  const { error } = await supabase.rpc("admin_delete_post", {
    target_post_id: postId
  });

  if (error) throw error;
};

export const adminDeleteUser = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const { error } = await supabase.rpc("admin_delete_user", {
    target_user_id: userId
  });

  if (error) throw error;
};

export const registerPushToken = async (
  supabase: SupabaseClient,
  {
    userId,
    platform,
    expoPushToken,
    deviceId
  }: {
    userId: string;
    platform: "ios" | "android" | "web";
    expoPushToken: string;
    deviceId: string;
  }
) => {
  const { error } = await supabase.from("user_push_tokens").upsert({
    user_id: userId,
    platform,
    expo_push_token: expoPushToken,
    device_id: deviceId,
    last_seen_at: new Date().toISOString(),
    is_active: true
  });

  if (error) throw error;
};

export const uploadPostImage = async (
  supabase: SupabaseClient,
  {
    userId,
    filePath,
    fileData,
    contentType
  }: {
    userId: string;
    filePath: string;
    fileData: ArrayBuffer | Blob;
    contentType: string;
  }
) => {
  const { data, error } = await supabase.storage
    .from("posts")
    .upload(`${userId}/${filePath}`, fileData, {
      contentType,
      upsert: false
    });

  if (error) throw error;
  return data.path;
};

export const getPublicImageUrl = (
  supabase: SupabaseClient,
  path: string
) => {
  const { data } = supabase.storage.from("posts").getPublicUrl(path);
  return data.publicUrl;
};
