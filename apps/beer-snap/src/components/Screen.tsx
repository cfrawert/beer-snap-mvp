import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@beer-snap/ui";

export const Screen = ({
  children,
  style
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
