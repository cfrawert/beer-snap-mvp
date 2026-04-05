import React from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Text, useTheme } from "@beer-snap/ui";
import { useAuth } from "../lib/auth";
import { useCurrentUserProfile } from "../hooks/useCurrentUserProfile";

export const AccountStatusBadge = ({ compact = false }: { compact?: boolean }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const signedIn = Boolean(user);
  const label = signedIn ? `@${profile?.handle ?? "loading"}` : "Guest";

  return (
    <Pressable
      onPress={() => router.push(signedIn ? "/profile" : "/auth")}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: compact ? 10 : 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.card : colors.surfaceElevated
      })}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: signedIn ? colors.success : colors.textMuted
        }}
      />
      {compact ? null : (
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: signedIn ? colors.text : colors.textMuted
          }}
        >
          {label}
        </Text>
      )}
      <Feather
        name={signedIn ? "user" : "log-in"}
        size={13}
        color={colors.textMuted}
      />
    </Pressable>
  );
};
