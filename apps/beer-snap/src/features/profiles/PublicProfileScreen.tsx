import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Text, Button, useTheme } from "@beer-snap/ui";
import {
  fetchUserProfile,
  fetchUserPosts,
  getPublicImageUrl
} from "@beer-snap/data";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import type { Post, UserProfile } from "@beer-snap/domain";
import { Image } from "expo-image";
import { SubscreenHeader } from "../../components/SubscreenHeader";
import { useFollowingIds } from "../../hooks/useFollowingIds";
import { APP_LIST_CONTENT_STYLE, APP_PADDED_SHELL_STYLE, APP_SHELL_STYLE } from "../../components/layout";

export const PublicProfileScreen = ({ handle }: { handle: string }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isFollowing, toggleFollowUser } = useFollowingIds();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const userProfile = await fetchUserProfile(supabase, handle);
      setProfile(userProfile);
      if (userProfile) {
        const page = await fetchUserPosts(supabase, userProfile.id, null, 30);
        setPosts(page.items);
      } else {
        setPosts([]);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load this profile."
      );
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          ...APP_PADDED_SHELL_STYLE
        }}
      >
        <SubscreenHeader title="Profile" subtitle="Public beer profile" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>{loadError ?? "User not found."}</Text>
        </View>
      </View>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const following = isFollowing(profile.id);

  const handleFollow = async () => {
    if (isOwnProfile) {
      router.replace("/profile");
      return;
    }

    if (!user) {
      router.push("/auth");
      return;
    }

    const nextShouldFollow = !following;
    setProfile((current) =>
      current
        ? {
            ...current,
            followerCount: Math.max(
              current.followerCount + (nextShouldFollow ? 1 : -1),
              0
            )
          }
        : current
    );

    try {
      await toggleFollowUser(profile.id, nextShouldFollow);
    } catch (error) {
      setProfile((current) =>
        current
          ? {
              ...current,
              followerCount: Math.max(
                current.followerCount + (nextShouldFollow ? -1 : 1),
                0
              )
            }
          : current
      );
      Alert.alert(
        "Follow failed",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        ...APP_PADDED_SHELL_STYLE
      }}
    >
      <SubscreenHeader
        title={`@${profile.handle}`}
        subtitle="Public beer profile"
      />
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textMuted }}>{profile.displayName}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>
          {profile.bio || "Beer only. Cheers."}
        </Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
          <Text>{profile.postCount} posts</Text>
          <Text>{profile.followerCount} followers</Text>
          <Text>{profile.followingCount} following</Text>
        </View>
        <View style={{ marginTop: 12 }}>
          <Button
            label={
              isOwnProfile ? "Edit profile" : following ? "Following" : "Follow"
            }
            onPress={handleFollow}
          />
        </View>
      </View>

      <FlatList
        data={posts}
        showsVerticalScrollIndicator={false}
        style={APP_SHELL_STYLE}
        contentContainerStyle={APP_LIST_CONTENT_STYLE}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16 }}>
            <Pressable onPress={() => router.push(`/p/${item.id}`)}>
              <Image
                source={{ uri: getPublicImageUrl(supabase, item.imagePath) }}
                contentFit="cover"
                style={{ width: "100%", height: 320, borderRadius: 16 }}
              />
            </Pressable>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <Text style={{ color: colors.textMuted }}>
            {loadError ?? "No posts yet."}
          </Text>
        }
      />
    </View>
  );
};
