import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import {
  deletePost,
  fetchUserReactions,
  fetchGlobalFeed,
  getPublicImageUrl
} from "@beer-snap/data";
import { IconButton, Text, useTheme } from "@beer-snap/ui";
import { Feather } from "@expo/vector-icons";
import { FeedCard } from "../../components/FeedCard";
import { APP_LIST_CONTENT_STYLE, APP_SHELL_STYLE } from "../../components/layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useFollowingIds } from "../../hooks/useFollowingIds";
import { requireSignedInUser } from "../../lib/requireSignedInUser";
import type { FeedPost } from "@beer-snap/data";
import type { FeedSort, ReactionType } from "@beer-snap/domain";
import { getNextReaction } from "../reactions/reactionState";
import { persistReaction } from "../reactions/reactionService";
import { promptToReportPost } from "../moderation/reporting";
import { updateFeedPost } from "../posts/postState";
import { sharePostLink } from "../posts/share";

export const FeedScreen = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isFollowing, toggleFollowUser } = useFollowingIds();
  const [items, setItems] = useState<FeedPost[]>([]);
  const [sort, setSort] = useState<FeedSort>("latest");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reactionsByPostId, setReactionsByPostId] = useState<
    Record<string, ReactionType | null>
  >({});

  const imageUrlFor = useCallback(
    (post: FeedPost) => getPublicImageUrl(supabase, post.imagePath),
    []
  );

  const loadFeed = useCallback(
    async ({ reset }: { reset: boolean }) => {
      if (loading) return;
      setLoading(true);
      const nextCursor = reset ? null : cursor;
      try {
        setLoadError(null);
        const page = await fetchGlobalFeed(supabase, {
          sort,
          cursor: nextCursor,
          limit: 10
        });
        if (user && page.items.length > 0) {
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
          error instanceof Error ? error.message : "Unable to load the feed."
        );
      } finally {
        setLoading(false);
      }
    },
    [cursor, loading, sort, user]
  );

  useEffect(() => {
    loadFeed({ reset: true });
  }, [sort, user?.id]);

  useEffect(() => {
    if (!user) {
      setReactionsByPostId({});
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed({ reset: true });
    setRefreshing(false);
  };

  const handleFollow = async (post: FeedPost) => {
    if (!requireSignedInUser(user, router)) return;
    try {
      await toggleFollowUser(post.user.id);
    } catch (error) {
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

    Alert.alert("Delete upload?", "This photo will disappear from the feed immediately.", [
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

  const sortIcon = useMemo(
    () =>
      sort === "latest" ? (
        <Feather name="clock" size={17} color={colors.text} />
      ) : (
        <Feather name="trending-up" size={17} color={colors.text} />
      ),
    [sort, colors.text]
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard
            post={item}
            imageUrl={imageUrlFor(item)}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 12
            }}
          >
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 }}>
                GLOBAL FEED
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 3 }}>
                {sort === "latest" ? "Latest pours" : "Top in the last 24h"}
              </Text>
            </View>
            <IconButton
              onPress={() =>
                setSort((prev) => (prev === "latest" ? "top24h" : "latest"))
              }
              icon={sortIcon}
              size={38}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 32 }}>
            <Text style={{ color: loadError ? colors.danger : colors.textMuted }}>
              {loadError
                ? loadError
                : "No pours yet. Post the first beer and the feed will wake up."}
            </Text>
          </View>
        }
      />
    </View>
  );
};
