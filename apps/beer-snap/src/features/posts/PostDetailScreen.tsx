import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  deletePost,
  fetchPostById,
  fetchUserReactions,
  getPublicImageUrl
} from "@beer-snap/data";
import { Button, Text, useTheme } from "@beer-snap/ui";
import type { FeedPost } from "@beer-snap/data";
import type { ReactionType } from "@beer-snap/domain";
import { FeedCard } from "../../components/FeedCard";
import { SubscreenHeader } from "../../components/SubscreenHeader";
import { APP_PADDED_SHELL_STYLE } from "../../components/layout";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useFollowingIds } from "../../hooks/useFollowingIds";
import { requireSignedInUser } from "../../lib/requireSignedInUser";
import { applyReactionToPost, getNextReaction } from "../reactions/reactionState";
import { persistReaction } from "../reactions/reactionService";
import { promptToReportPost } from "../moderation/reporting";
import { sharePostLink } from "./share";

export const PostDetailScreen = ({ postId }: { postId?: string }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isFollowing, toggleFollowUser } = useFollowingIds();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!postId) {
      setError("Missing post id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const nextPost = await fetchPostById(supabase, postId);
      setPost(nextPost);
      if (user && nextPost) {
        const reactions = await fetchUserReactions(supabase, {
          userId: user.id,
          postIds: [nextPost.id]
        });
        setActiveReaction(reactions[nextPost.id] ?? null);
      } else {
        setActiveReaction(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load this post."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    const signedInUser = requireSignedInUser(user, router);
    if (!post || !signedInUser) return;

    try {
      await toggleFollowUser(post.user.id);
    } catch (followError) {
      Alert.alert(
        "Follow failed",
        followError instanceof Error ? followError.message : "Please try again."
      );
    }
  };

  const handleReaction = async (reaction: ReactionType) => {
    const signedInUser = requireSignedInUser(user, router);
    if (!post || !signedInUser) return;

    const previousReaction = activeReaction;
    const nextReaction = getNextReaction(previousReaction, reaction);
    setActiveReaction(nextReaction);
    setPost((current) =>
      current ? applyReactionToPost(current, previousReaction, nextReaction) : current
    );

    try {
      await persistReaction(supabase, {
        postId: post.id,
        userId: signedInUser.id,
        reaction: nextReaction
      });
    } catch (reactionError) {
      setActiveReaction(previousReaction);
      setPost((current) =>
        current ? applyReactionToPost(current, nextReaction, previousReaction) : current
      );
      Alert.alert(
        "Reaction failed",
        reactionError instanceof Error
          ? reactionError.message
          : "Please try again."
      );
    }
  };

  const handleReport = async () => {
    const signedInUser = requireSignedInUser(user, router);
    if (!post || !signedInUser) return;

    promptToReportPost(supabase, {
      reporterUserId: signedInUser.id,
      postId: post.id
    });
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      await sharePostLink(post.id);
    } catch (error) {
      Alert.alert(
        "Share failed",
        error instanceof Error ? error.message : "Unable to share this post."
      );
    }
  };

  const handleDelete = () => {
    const signedInUser = requireSignedInUser(user, router);
    if (!post || !signedInUser || post.user.id !== signedInUser.id) return;

    Alert.alert("Delete upload?", "This photo will disappear from every feed immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(supabase, post.id);
            router.replace("/profile");
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: 40,
        ...APP_PADDED_SHELL_STYLE
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
      }
    >
      <SubscreenHeader
        title="Post"
        subtitle="Single beer post"
        backLabel="Back to feed"
      />
      {loading ? (
        <Text style={{ color: colors.textMuted }}>Loading post…</Text>
      ) : post ? (
        <>
          <FeedCard
            post={post}
            imageUrl={getPublicImageUrl(supabase, post.imagePath)}
            onProfile={() =>
              post.user.id === user?.id
                ? router.push("/profile")
                : router.push(`/u/${post.user.handle}`)
            }
            onFollow={handleFollow}
            onLike={() => handleReaction("like")}
            onDislike={() => handleReaction("dislike")}
            onShare={handleShare}
            onReport={handleReport}
            onDelete={handleDelete}
            isFollowing={isFollowing(post.user.id)}
            activeReaction={activeReaction}
            isOwnPost={post.user.id === user?.id}
          />
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 22,
              padding: 16,
              backgroundColor: colors.surface
            }}
          >
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>
              About this post
            </Text>
            <Text style={{ color: colors.textMuted }}>
              Posted by @{post.user.handle}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>
              {new Date(post.createdAt).toLocaleString()}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 12 }}>
              {post.likeCount} likes · {post.dislikeCount} dislikes
            </Text>
          </View>
        </>
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 22,
            padding: 20,
            backgroundColor: colors.surface
          }}
        >
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Post unavailable</Text>
          <Text style={{ color: colors.textMuted, marginBottom: 16 }}>
            {error ?? "This post was deleted or is no longer public."}
          </Text>
          <Button label="Back to feed" onPress={() => router.replace("/feed")} />
        </View>
      )}
    </ScrollView>
  );
};

export default function PostDetailRoute() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  return <PostDetailScreen postId={postId} />;
}
