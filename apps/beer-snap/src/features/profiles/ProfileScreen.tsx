import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button, Text, useTheme } from "@beer-snap/ui";
import {
  deletePost,
  fetchUserPosts,
  getPublicImageUrl,
  updateUserProfile
} from "@beer-snap/data";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useCurrentUserProfile } from "../../hooks/useCurrentUserProfile";
import type { Post } from "@beer-snap/domain";
import { Image } from "expo-image";
import { SubscreenHeader } from "../../components/SubscreenHeader";
import { APP_LIST_CONTENT_STYLE, APP_PADDED_SHELL_STYLE, APP_SHELL_STYLE } from "../../components/layout";

export const ProfileScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile, setProfile, applyProfileDelta } = useCurrentUserProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(
    null
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoadingPosts(true);
    try {
      const page = await fetchUserPosts(supabase, user.id, null, 30);
      setPosts(page.items);
    } catch (error) {
      setFeedback({
        tone: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load your posts right now."
      });
    } finally {
      setLoadingPosts(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setHandle(profile?.handle ?? "");
    setDisplayName(profile?.displayName ?? "");
    setBio(profile?.bio ?? "");
  }, [profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const saveProfile = async () => {
    if (!user) return;

    const normalizedHandle = handle
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
    const trimmedName = displayName.trim();
    const trimmedBio = bio.trim();

    if (normalizedHandle.length < 3) {
      setFeedback({
        tone: "danger",
        message: "Handle must be at least 3 characters."
      });
      return;
    }

    if (!trimmedName) {
      setFeedback({
        tone: "danger",
        message: "Display name cannot be empty."
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const nextProfile = await updateUserProfile(supabase, {
        userId: user.id,
        handle: normalizedHandle,
        displayName: trimmedName,
        bio: trimmedBio || null
      });
      setProfile(nextProfile);
      setHandle(nextProfile.handle);
      setDisplayName(nextProfile.displayName);
      setBio(nextProfile.bio ?? "");
      setEditing(false);
      setFeedback({
        tone: "success",
        message: "Profile updated."
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.toLowerCase().includes("duplicate key")
          ? "That handle is already taken."
          : error instanceof Error
          ? error.message
          : "Unable to save your profile right now.";
      setFeedback({
        tone: "danger",
        message
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePost = (postId: string) => {
    Alert.alert("Delete post?", "This removes the photo from all feeds immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(supabase, postId);
            setPosts((current) => current.filter((post) => post.id !== postId));
            applyProfileDelta({ postDelta: -1 });
            setFeedback({
              tone: "success",
              message: "Post deleted."
            });
          } catch (error) {
            setFeedback({
              tone: "danger",
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to delete that post."
            });
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
          backgroundColor: colors.bg,
          ...APP_PADDED_SHELL_STYLE
        }}
      >
        <SubscreenHeader
          title="Your Profile"
          subtitle="Manage your public Beer Snap profile"
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Sign in to view your profile.</Text>
          <Pressable onPress={() => router.push("/auth")}>
            <Text style={{ color: colors.accent, marginTop: 8 }}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        ...APP_PADDED_SHELL_STYLE
      }}
    >
      <SubscreenHeader
        title="Your Profile"
        subtitle="Everything here is public in Beer Snap v1"
      />
      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 12
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
              @{profile?.handle}
            </Text>
            <Text style={{ color: colors.textMuted }}>{profile?.displayName}</Text>
          </View>
          <Button
            label={editing ? "Cancel" : "Edit profile"}
            variant="ghost"
            onPress={() => {
              setEditing((current) => !current);
              setFeedback(null);
              setHandle(profile?.handle ?? "");
              setDisplayName(profile?.displayName ?? "");
              setBio(profile?.bio ?? "");
            }}
          />
        </View>
        {editing ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              backgroundColor: colors.surface,
              padding: 16,
              marginBottom: 12
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
              Handle
            </Text>
            <TextInput
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              placeholder="maya-pours"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: colors.text,
                marginBottom: 12
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
              Display name
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Maya Brewer"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: colors.text,
                marginBottom: 12
              }}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Beer only. Cheers."
              placeholderTextColor={colors.textMuted}
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 18,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: colors.text,
                minHeight: 108,
                textAlignVertical: "top",
                marginBottom: 12
              }}
            />
            <Button
              label={saving ? "Saving..." : "Save profile"}
              onPress={saving ? undefined : saveProfile}
            />
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>
            {profile?.bio || "Beer only. Cheers."}
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
          <Text>{profile?.postCount ?? 0} posts</Text>
          <Text>{profile?.followerCount ?? 0} followers</Text>
          <Text>{profile?.followingCount ?? 0} following</Text>
        </View>
        {feedback ? (
          <Text
            style={{
              marginTop: 12,
              color: feedback.tone === "success" ? colors.success : colors.danger
            }}
          >
            {feedback.message}
          </Text>
        ) : null}
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
            <Pressable
              onPress={() => confirmDeletePost(item.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 8
              }}
            >
              <Feather name="trash-2" size={16} color={colors.danger} />
              <Text style={{ color: colors.danger }}>Delete</Text>
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
            {loadingPosts ? "Loading your posts..." : "You have not posted a beer yet."}
          </Text>
        }
      />
    </View>
  );
};
