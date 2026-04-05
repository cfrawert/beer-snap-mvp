import React, { useMemo, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Platform, View, useWindowDimensions } from "react-native";
import { FloatingActionButton, useTheme } from "@beer-snap/ui";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TopNav } from "../../src/components/TopNav";
import { SideSheet } from "../../src/components/SideSheet";
import { useAuth } from "../../src/lib/auth";
import { useCurrentUserProfile } from "../../src/hooks/useCurrentUserProfile";
import { usePushNotifications } from "../../src/lib/notifications";

export default function MainLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signOut, user } = useAuth();
  const { profile } = useCurrentUserProfile();
  const [sheetOpen, setSheetOpen] = useState(false);

  usePushNotifications(user?.id ?? null);

  const active = useMemo(() => {
    if (pathname.includes("following")) return "following" as const;
    return "feed" as const;
  }, [pathname]);

  const floatingButtonBottom =
    Platform.OS === "web"
      ? width < 768
        ? Math.max(insets.bottom, 20) + 72
        : 24
      : Math.max(insets.bottom, Platform.OS === "android" ? 18 : 12);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopNav
        active={active}
        onChange={(value) => router.replace(`/${value}`)}
        onOpenSheet={() => setSheetOpen(true)}
      />
      <Slot />
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: floatingButtonBottom
        }}
      >
        <FloatingActionButton
          onPress={() => router.push("/post")}
          icon={<Feather name="camera" size={24} color={colors.accentContrast} />}
        />
      </View>
      <SideSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onProfile={() => {
          setSheetOpen(false);
          router.push("/profile");
        }}
        onNotifications={() => {
          setSheetOpen(false);
          router.push("/notifications");
        }}
        onAdmin={() => {
          setSheetOpen(false);
          router.push("/admin");
        }}
        onSignIn={() => {
          setSheetOpen(false);
          router.push("/auth");
        }}
        onSignOut={() => {
          setSheetOpen(false);
          signOut().finally(() => {
            router.replace("/feed");
          });
        }}
        isAuthenticated={Boolean(user)}
        isAdmin={profile?.status === "admin"}
        handle={profile?.handle}
      />
    </View>
  );
}
