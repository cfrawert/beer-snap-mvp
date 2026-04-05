import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Text, useTheme } from "@beer-snap/ui";
import { fetchNotifications, markNotificationRead } from "@beer-snap/data";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import type { AppNotification } from "@beer-snap/domain";
import { SubscreenHeader } from "../../components/SubscreenHeader";
import {
  APP_LIST_CONTENT_STYLE,
  APP_PADDED_SHELL_STYLE,
  APP_SHELL_STYLE
} from "../../components/layout";
import { getNotificationHref } from "./notificationNavigation";

const formatLabel = (notification: AppNotification) => {
  const actor = notification.actorHandle ? `@${notification.actorHandle}` : "Someone";
  switch (notification.type) {
    case "follow":
      return `${actor} followed you`;
    case "post":
      return `${actor} posted a new beer`;
    case "reaction":
      return `${actor} reacted to your post`;
    case "report":
      return "Report update";
    case "admin":
      return "Admin update";
    default:
      return "Notification";
  }
};

export const NotificationsScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    try {
      setLoadError(null);
      const data = await fetchNotifications(supabase, user.id);
      setItems(data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load notifications right now."
      );
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const openNotification = async (notification: AppNotification) => {
    setItems((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item
      )
    );

    await markNotificationRead(supabase, notification.id);

    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, ...APP_PADDED_SHELL_STYLE }}>
        <SubscreenHeader
          title="Notifications"
          subtitle="See follows, reactions, and post alerts"
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ marginBottom: 12 }}>Sign in to view notifications.</Text>
          <Button label="Sign in" onPress={() => router.push("/auth")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        style={APP_SHELL_STYLE}
        contentContainerStyle={APP_LIST_CONTENT_STYLE}
        renderItem={({ item }) => {
          const href = getNotificationHref(item);
          return (
            <Pressable
              onPress={() => openNotification(item)}
              style={{
                padding: 16,
                borderRadius: 22,
                backgroundColor: item.readAt ? colors.surface : colors.card,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: href ? colors.border : "transparent"
              }}
            >
              <Text style={{ fontWeight: "600", lineHeight: 22 }}>{formatLabel(item)}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              {href ? (
                <Text style={{ color: colors.accent, marginTop: 10, fontSize: 12 }}>
                  Open {item.postId ? "post" : "profile"}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
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
        ListHeaderComponent={<SubscreenHeader title="Notifications" subtitle="Tap a notification to open the relevant profile or post" />}
        ListEmptyComponent={
          <Text style={{ color: loadError ? colors.danger : colors.textMuted }}>
            {loadError ?? "Nothing new yet."}
          </Text>
        }
      />
    </View>
  );
};
