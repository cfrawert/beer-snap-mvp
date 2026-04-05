import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "@beer-snap/data";
import { supabase } from "./supabase";

export const usePushNotifications = (userId: string | null) => {
  useEffect(() => {
    if (!userId) return;

    const register = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const projectId = Constants.expoConfig?.extra?.expoProjectId as
        | string
        | undefined;

      if (!projectId) return;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId
      });

      await registerPushToken(supabase, {
        userId,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web",
        expoPushToken: tokenData.data,
        deviceId: Constants.deviceName ?? "unknown"
      });
    };

    register();
  }, [userId]);
};
