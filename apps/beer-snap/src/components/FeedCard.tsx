import React from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { IconButton, Text, useTheme } from "@beer-snap/ui";
import type { FeedPost } from "@beer-snap/data";
import { PostActionMenu } from "./PostActionMenu";

export const FeedCard = ({
  post,
  imageUrl,
  onProfile,
  onFollow,
  onLike,
  onDislike,
  onShare,
  onReport,
  onDelete,
  isFollowing,
  activeReaction,
  isOwnPost
}: {
  post: FeedPost;
  imageUrl: string;
  onProfile: () => void;
  onFollow: () => void;
  onLike: () => void;
  onDislike: () => void;
  onShare: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  isFollowing: boolean;
  activeReaction?: "like" | "dislike" | null;
  isOwnPost?: boolean;
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const imageHeight = width < 430 ? Math.min(width * 1.16, 620) : Math.min(width * 1.24, 760);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        transition={180}
        style={[styles.image, { height: imageHeight }]}
      />
      <View style={styles.topOverlay}>
        <Pressable
          onPress={onProfile}
          style={[
            styles.profileRow,
            {
              backgroundColor: colors.overlay,
              borderColor: colors.overlayBorder
            }
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.accentSoft, borderColor: colors.overlayBorder }
            ]}
          />
          <Text style={{ fontWeight: "600", fontSize: 13 }}>@{post.user.handle}</Text>
        </Pressable>
        <View style={styles.actionsRow}>
          {isOwnPost ? null : (
            <IconButton
              onPress={onFollow}
              icon={
                <Feather
                  name={isFollowing ? "check" : "plus"}
                  size={18}
                  color={isFollowing ? colors.accentContrast : colors.text}
                />
              }
              size={38}
              style={
                isFollowing
                  ? {
                      backgroundColor: colors.accent,
                      borderColor: colors.accent
                    }
                  : {
                      backgroundColor: colors.overlay,
                      borderColor: colors.overlayBorder
                    }
              }
            />
          )}
          <PostActionMenu
            canDelete={Boolean(isOwnPost)}
            canReport={!isOwnPost}
            onShare={onShare}
            onDelete={onDelete}
            onReport={onReport}
          />
        </View>
      </View>
      <View style={styles.bottomOverlay}>
        <ReactionButton
          iconName="thumbs-down"
          count={post.dislikeCount}
          onPress={onDislike}
          active={activeReaction === "dislike"}
          activeBackground={colors.danger}
          activeColor="#F7F7F4"
        />
        <ReactionButton
          iconName="thumbs-up"
          count={post.likeCount}
          onPress={onLike}
          active={activeReaction === "like"}
          activeBackground={colors.accent}
          activeColor={colors.accentContrast}
        />
      </View>
    </View>
  );
};

const ReactionButton = ({
  iconName,
  count,
  onPress,
  active,
  activeBackground,
  activeColor
}: {
  iconName: "thumbs-up" | "thumbs-down";
  count: number;
  onPress: () => void;
  active: boolean;
  activeBackground: string;
  activeColor: string;
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.reactionButton,
        {
          backgroundColor: active
            ? activeBackground
            : pressed
            ? colors.overlayPressed
            : colors.overlay,
          borderColor: active ? activeBackground : colors.overlayBorder
        }
      ]}
    >
      <Feather
        name={iconName}
        size={16}
        color={active ? activeColor : colors.textMuted}
      />
      <Text
        style={{
          fontSize: 11,
          color: active ? activeColor : colors.textMuted,
          fontWeight: "600",
          minWidth: 12,
          textAlign: "center"
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 22,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1
  },
  image: {
    width: "100%"
  },
  topOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 16,
    right: 16,
    flexDirection: "row",
    gap: 8
  },
  reactionButton: {
    minWidth: 54,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  }
});
