import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, useTheme } from "@beer-snap/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountStatusBadge } from "./AccountStatusBadge";
import { ThemeToggleButton } from "./ThemeToggleButton";

export const SubscreenHeader = ({
  title,
  subtitle,
  backLabel = "Back to feed",
  href = "/feed"
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  href?: "/feed" | "/following" | "/profile" | "/notifications" | "/auth";
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 520;

  return (
    <View style={{ marginBottom: 20, paddingTop: Math.max(insets.top, 10) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Pressable
          onPress={() => router.replace(href)}
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated
          }}
        >
          <Feather name="arrow-left" size={14} color={colors.textMuted} />
          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
            {backLabel}
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AccountStatusBadge compact={compact} />
          <ThemeToggleButton />
        </View>
      </View>
      <Text style={{ fontSize: 28, fontWeight: "700", marginTop: 16 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, marginTop: 6, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};
