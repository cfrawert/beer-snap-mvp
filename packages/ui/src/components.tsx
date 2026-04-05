import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextStyle,
  View,
  ViewStyle
} from "react-native";
import { useTheme } from "./provider";

export const Box = ({
  style,
  children
}: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) => <View style={style}>{children}</View>;

export const Text = ({
  style,
  children,
  numberOfLines
}: {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  numberOfLines?: number;
}) => {
  const { colors } = useTheme();
  const flattened = StyleSheet.flatten(style) ?? {};
  const weight = flattened.fontWeight;
  const fontFamily =
    weight === "700" || weight === 700
      ? "SpaceGrotesk_700Bold"
      : weight === "600" || weight === 600
      ? "SpaceGrotesk_600SemiBold"
      : "SpaceGrotesk_400Regular";

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[{ color: colors.text, fontFamily }, style]}
    >
      {children}
    </RNText>
  );
};

export const Button = ({
  label,
  onPress,
  variant = "primary",
  style
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "danger";
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors, radius } = useTheme();
  const isGhost = variant === "ghost";
  const background =
    variant === "primary"
      ? colors.accent
      : variant === "danger"
      ? colors.danger
      : colors.surfaceElevated;
  const textColor =
    variant === "ghost"
      ? colors.text
      : variant === "danger"
      ? "#FFF7F8"
      : colors.accentContrast;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 46,
          paddingVertical: 11,
          paddingHorizontal: 16,
          borderRadius: radius.pill,
          backgroundColor: pressed ? `${background}D8` : background,
          borderWidth: 1,
          borderColor:
            variant === "primary"
              ? colors.accent
              : variant === "danger"
              ? colors.danger
              : colors.border,
          alignItems: "center",
          justifyContent: "center"
        },
        style
      ]}
    >
      <Text
        style={{
          fontWeight: "600",
          color: textColor,
          fontSize: 14,
          letterSpacing: 0.1
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const IconButton = ({
  icon,
  onPress,
  style,
  size = 44
}: {
  icon: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  size?: number;
}) => {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? colors.card : colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border
        },
        style
      ]}
    >
      {icon}
    </Pressable>
  );
};

export const FloatingActionButton = ({
  icon,
  onPress
}: {
  icon: React.ReactNode;
  onPress?: () => void;
}) => {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? `${colors.accent}D8` : colors.accent,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.accent
        }
      ]}
    >
      {icon}
    </Pressable>
  );
};

export const SegmentedControl = ({
  options,
  value,
  onChange
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
        gap: 4,
        minWidth: 228,
        maxWidth: "100%",
        overflow: "hidden"
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flexGrow: 1,
              flexBasis: 0,
              minWidth: 108,
              paddingVertical: 9,
              paddingHorizontal: 16,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.card : "transparent",
              alignItems: "center",
              borderWidth: active ? 1 : 0,
              borderColor: active ? colors.border : "transparent"
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: active ? colors.text : colors.textMuted,
                fontWeight: active ? "600" : "400",
                textAlign: "center"
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7
  }
});
