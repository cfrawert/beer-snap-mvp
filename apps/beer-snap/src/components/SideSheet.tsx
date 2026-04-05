import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { Button, Text, useTheme, useThemePreference } from "@beer-snap/ui";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const SideSheet = ({
  visible,
  onClose,
  onProfile,
  onNotifications,
  onAdmin,
  onSignIn,
  onSignOut,
  isAuthenticated,
  isAdmin,
  handle
}: {
  visible: boolean;
  onClose: () => void;
  onProfile: () => void;
  onNotifications: () => void;
  onAdmin: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  handle?: string | null;
}) => {
  const { colors, radius } = useTheme();
  const { preference, setPreference } = useThemePreference();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sheetWidth = Math.min(width < 480 ? width - 12 : 320, 320);
  const translateX = useRef(new Animated.Value(sheetWidth + 24)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : sheetWidth + 24,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [visible, translateX, sheetWidth]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              width: sheetWidth,
              backgroundColor: colors.surfaceElevated,
              borderTopLeftRadius: radius.lg,
              borderBottomLeftRadius: radius.lg,
              paddingTop: Math.max(insets.top, 18),
              paddingBottom: Math.max(insets.bottom, 18),
              transform: [{ translateX }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>Menu</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {isAuthenticated ? "Signed in as" : "Browsing as"}
            </Text>
            <Text style={{ fontSize: 16, marginTop: 4 }}>
              {isAuthenticated ? `@${handle ?? "beer-lover"}` : "guest"}
            </Text>
          </View>
          <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
              Appearance
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Light"
                variant={preference === "light" ? "primary" : "ghost"}
                onPress={() => setPreference("light")}
                style={{ flex: 1 }}
              />
              <Button
                label="Dark"
                variant={preference === "dark" ? "primary" : "ghost"}
                onPress={() => setPreference("dark")}
                style={{ flex: 1 }}
              />
            </View>
          </View>
          <View style={styles.section}>
            {isAuthenticated ? (
              <>
                <Button label="Profile" onPress={onProfile} />
                <View style={{ height: 12 }} />
                <Button label="Notifications" onPress={onNotifications} />
                {isAdmin ? (
                  <>
                    <View style={{ height: 12 }} />
                    <Button label="Admin Review" onPress={onAdmin} />
                  </>
                ) : null}
              </>
            ) : (
              <Button label="Sign in" onPress={onSignIn} />
            )}
          </View>
          <View style={[styles.section, { marginTop: "auto", marginBottom: 0 }]}>
            {isAuthenticated ? (
              <Button label="Sign out" onPress={onSignOut} variant="ghost" />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.46)",
    justifyContent: "flex-end"
  },
  sheet: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 18
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  }
});
