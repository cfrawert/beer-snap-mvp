import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import {
  adminApprovePost,
  adminDeletePost,
  adminDeleteUser,
  fetchAdminReviewItems,
  getPublicImageUrl
} from "@beer-snap/data";
import type { AdminReviewPostItem } from "@beer-snap/domain";
import { Button, Text, useTheme } from "@beer-snap/ui";
import { Image } from "expo-image";
import { supabase } from "../../lib/supabase";
import { useCurrentUserProfile } from "../../hooks/useCurrentUserProfile";
import {
  APP_LIST_CONTENT_STYLE,
  APP_PADDED_SHELL_STYLE,
  APP_SHELL_STYLE
} from "../../components/layout";
import { SubscreenHeader } from "../../components/SubscreenHeader";

export const AdminReviewScreen = () => {
  const { colors } = useTheme();
  const { profile } = useCurrentUserProfile();
  const [items, setItems] = useState<AdminReviewPostItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setItems(await fetchAdminReviewItems(supabase));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load the review queue."
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolvePost = async (
    postId: string,
    action: "approve" | "delete"
  ) => {
    try {
      if (action === "approve") {
        await adminApprovePost(supabase, postId);
      } else {
        await adminDeletePost(supabase, postId);
      }

      setItems((current) => current.filter((item) => item.postId !== postId));
    } catch (error) {
      Alert.alert(
        action === "approve" ? "Approve failed" : "Delete failed",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  };

  const confirmDeleteUser = (userId: string, handle: string) => {
    Alert.alert(
      "Delete user?",
      `@${handle} and all of their uploads will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete user",
          style: "destructive",
          onPress: async () => {
            try {
              await adminDeleteUser(supabase, userId);
              setItems((current) =>
                current.filter((item) => item.post?.user.id !== userId)
              );
            } catch (error) {
              Alert.alert(
                "Delete failed",
                error instanceof Error ? error.message : "Unable to delete this user."
              );
            }
          }
        }
      ]
    );
  };

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading admin profile...</Text>
      </View>
    );
  }

  if (profile.status !== "admin") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Admin access only.</Text>
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
        title="Admin Review"
        subtitle="Reports, disliked posts, and account actions"
      />
      <FlatList
        style={APP_SHELL_STYLE}
        contentContainerStyle={APP_LIST_CONTENT_STYLE}
        data={items}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <View
            style={{
              paddingVertical: 28,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 16
            }}
          >
            <Text style={{ color: loadError ? colors.danger : colors.textMuted }}>
              {loadError ?? "Nothing is waiting for review."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const post = item.post;
          const postAuthor = post?.user;

          return (
            <View
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface
              }}
            >
              {post?.imagePath ? (
                <Image
                  source={{ uri: getPublicImageUrl(supabase, post.imagePath) }}
                  contentFit="cover"
                  style={{ width: "100%", height: 280, borderRadius: 18 }}
                />
              ) : null}
              <Text style={{ marginTop: 10, fontWeight: "700" }}>
                {postAuthor ? `@${postAuthor.handle}` : "Removed post"}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                Source: {item.source} · Priority {item.priority}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              {item.reports.length > 0 ? (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {item.reports.map((report) => (
                    <View
                      key={report.id}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: colors.card
                      }}
                    >
                      <Text style={{ fontWeight: "600" }}>
                        {report.reasonCode.replace(/_/g, " ")}
                      </Text>
                      <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                        Reported by @{report.reporterHandle ?? "unknown"}
                      </Text>
                      {report.note ? (
                        <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                          {report.note}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Button
                  label="Approve"
                  onPress={() => resolvePost(item.postId, "approve")}
                />
                <Button
                  label="Delete post"
                  variant="danger"
                  onPress={() => resolvePost(item.postId, "delete")}
                />
              </View>
              {postAuthor ? (
                <View style={{ marginTop: 10 }}>
                  <Button
                    label="Delete user"
                    variant="danger"
                    onPress={() => confirmDeleteUser(postAuthor.id, postAuthor.handle)}
                  />
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
};
