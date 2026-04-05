import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import {
  deletePost,
  fetchUserReactions,
  fetchFollowingFeed,
  getPublicImageUrl
} from "@beer-snap/data";
import { Button, Text, useTheme } from "@beer-snap/ui";
import { FeedCard } from "../../components/FeedCard";
import {
  APP_LIST_CONTENT_STYLE,
  APP_PADDED_SHELL_STYLE,
  APP_SHELL_STYLE
} from "../../components/layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useFollowingIds } from "../../hooks/useFollowingIds";
import { requireSignedInUser } from "../../lib/requireSignedInUser";
import type { FeedPost } from "@beer-snap/data";
import type { ReactionType } from "@beer-snap/domain";
import { getNextReaction } from "../reactions/reactionState";
import { persistReaction } from "../reactions/reactionService";
import { promptToReportPost } from "../moderation/reporting";
import { removePostsByAuthor, updateFeedPost } from "../posts/postState";
import { sharePostLink } from "../posts/share";

export const FollowingScreen = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { followingIds, isFollowing, toggleFollowUser } = useFollowingIds();
  const [items, setItems] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reactionsByPostId, setReactionsByPostId] = useState<
    Record<string, ReactionType | null>
  >({});

  const loadFeed = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if (!user || loading) return;
      setLoading(true);
      const nextCursor = reset ? null : cursor;
      try {
        setLoadError(null);
        const page = await fetchFollowingFeed(supabase, {
          userId: user.id,
          cursor: nextCursor,
          limit: 10
        });
        if (page.items.length > 0) {
          const reactions = await fetchUserReactions(supabase, {
            userId: user.id,
            postIds: page.items.map((item) => item.id)
          });
          setReactionsByPostId((prev) => {
            const next = reset ? {} : { ...prev };
            for (const item of page.items) {
              next[item.id] = reactions[item.id] ?? null;
            }
            return next;
          });
        } else if (reset) {
          setReactionsByPostId({});
        }
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
      } catch (error) {
        if (reset) {
          setItems([]);
          setCursor(null);
        }
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load the following feed."
        );
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading, user]
  );

  useEffect(() => {
    if (user) {
      loadFeed({ reset: true });
    } else {
      setItems([]);
      setCursor(null);
      setReactionsByPostId({});
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadFeed({ reset: true });
    }
  }, [followingIds.join("|"), user?.id]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadFeed({ reset: true });
    setRefreshing(false);
  };

  const handleFollow = async (post: FeedPost) => {
    const signedInUser = requireSignedInUser(user, router);
    if (!signedInUser) return;

    const currentlyFollowing = isFollowing(post.user.id);
    if (currentlyFollowing) {
      setItems((prev) => removePostsByAuthor(prev, post.user.id));
    }
    try {
      await toggleFollowUser(post.user.id);
    } catch (error) {
      if (currentlyFollowing) {
        loadFeed({ reset: true });
      }
      Alert.alert(
        "Follow failed",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const handleReaction = async (post: FeedPost, reaction: "like" | "dislike") => {
    const signedInUser = requireSignedInUser(user, router);
    if (!signedInUser) return;

    const previousReaction = reactionsByPostId[post.id] ?? null;
    const nextReaction = getNextReaction(previousReaction, reaction);
    setReactionsByPostId((prev) => ({
      ...prev,
      [post.id]: nextReaction
    }));
    setItems((prev) => updateFeedPost(prev, post.id, previousReaction, nextReaction));

    try {
      await persistReaction(supabase, {
        postId: post.id,
        userId: signedInUser.id,
        reaction: nextReaction
      });
    } catch (error) {
      setReactionsByPostId((prev) => ({
        ...prev,
        [post.id]: previousReaction
      }));
      setItems((prev) => updateFeedPost(prev, post.id, nextReaction, previousReaction));
      Alert.alert(
        "Reaction failed",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const handleReport = (post: FeedPost) => {
    const signedInUser = requireSignedInUser(user, router);
    if (!signedInUser) return;

    promptToReportPost(supabase, {
      reporterUserId: signedInUser.id,
      postId: post.id
    });
  };

  const handleShare = async (post: FeedPost) => {
    try {
      await sharePostLink(post.id);
    } catch (error) {
      Alert.alert(
        "Share failed",
        error instanceof Error ? error.message : "Unable to share this post."
      );
    }
  };

  const handleDelete = (post: FeedPost) => {
    const signedInUser = requireSignedInUser(user, router);
    if (!signedInUser || post.user.id !== signedInUser.id) return;

    Alert.alert("Delete upload?", "This photo will disappear from the following feed immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(supabase, post.id);
            setItems((current) => current.filter((item) => item.id !== post.id));
          } catch (error) {
            Alert.alert(
              "Delete failed",
              error instanceof Error ? error.message : "Unable to delete this upload."
            );
          }
        }
      }
    ]);
  };

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          ...APP_PADDED_SHELL_STYLE
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
          Sign in to follow people
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            marginBottom: 16,
            lineHeight: 22
          }}
        >
          Your following feed only shows the latest posts from people you follow.
        </Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard
            post={item}
            imageUrl={getPublicImageUrl(supabase, item.imagePath)}
            onProfile={() =>
              item.user.id === user?.id
                ? router.push("/profile")
                : router.push(`/u/${item.user.handle}`)
            }
            onFollow={() => handleFollow(item)}
            onLike={() => handleReaction(item, "like")}
            onDislike={() => handleReaction(item, "dislike")}
            onShare={() => handleShare(item)}
            onReport={() => handleReport(item)}
            onDelete={() => handleDelete(item)}
            isFollowing={isFollowing(item.user.id)}
            activeReaction={reactionsByPostId[item.id] ?? null}
            isOwnPost={item.user.id === user?.id}
          />
        )}
        style={APP_SHELL_STYLE}
        contentContainerStyle={APP_LIST_CONTENT_STYLE}
        onEndReached={() => loadFeed({ reset: false })}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 }}>
              FOLLOWING
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 3 }}>
              Latest pours from people you follow
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 28 }}>
            <Text style={{ color: loadError ? colors.danger : colors.textMuted }}>
              {loadError
                ? loadError
                : "Follow a few beer lovers to see their latest pours."}
            </Text>
          </View>
        }
      />
    </View>
  );
};
