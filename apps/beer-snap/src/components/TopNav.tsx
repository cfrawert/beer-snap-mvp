import React from "react";
import { View, useWindowDimensions } from "react-native";
import { SegmentedControl, IconButton, useTheme } from "@beer-snap/ui";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_PADDED_SHELL_STYLE } from "./layout";
import { AccountStatusBadge } from "./AccountStatusBadge";
import { ThemeToggleButton } from "./ThemeToggleButton";

export const TopNav = ({
  active,
  onChange,
  onOpenSheet
}: {
  active: "feed" | "following";
  onChange: (value: "feed" | "following") => void;
  onOpenSheet: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 390;

  return (
    <View
      style={{
        ...APP_PADDED_SHELL_STYLE,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: Math.max(insets.top, 8) + 6,
        paddingBottom: compact ? 8 : 10,
        gap: compact ? 10 : 12
      }}
    >
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: compact ? 10 : 12 }}>
        <View
          style={{
            width: compact ? 8 : 10,
            height: compact ? 8 : 10,
            borderRadius: 999,
            backgroundColor: colors.accent
          }}
        />
        <View style={{ flex: 1 }}>
          <SegmentedControl
            options={[
              { label: "Feed", value: "feed" },
              { label: "Following", value: "following" }
            ]}
            value={active}
            onChange={(value) => onChange(value as "feed" | "following")}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <AccountStatusBadge compact={compact} />
        <ThemeToggleButton />
        <IconButton
          onPress={onOpenSheet}
          icon={<Feather name="align-right" size={18} color={colors.text} />}
          size={compact ? 38 : 40}
        />
      </View>
    </View>
  );
};
