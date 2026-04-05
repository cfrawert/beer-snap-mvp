import Constants from "expo-constants";
import { Alert, Platform, Share } from "react-native";
import { DEFAULT_SITE_URL, getPostShareUrlForSite, normalizeSiteUrl } from "./shareUrl";

const env = (
  globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }
).process?.env;

const cleanEnv = (value?: string) => value?.trim();

const configuredSiteUrl =
  cleanEnv(Constants.expoConfig?.extra?.siteUrl as string | undefined) ??
  cleanEnv(env?.EXPO_PUBLIC_SITE_URL) ??
  DEFAULT_SITE_URL;

export const getSiteUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return normalizeSiteUrl(window.location.origin);
  }

  return normalizeSiteUrl(configuredSiteUrl);
};

export const getPostShareUrl = (postId: string) =>
  getPostShareUrlForSite(getSiteUrl(), postId);

const webShare = async (url: string) => {
  if (typeof navigator === "undefined") {
    return;
  }

  if (typeof navigator.share === "function") {
    await navigator.share({
      title: "Beer Snap",
      text: "Check out this Beer Snap post.",
      url
    });
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    Alert.alert("Link copied", "Share link copied to your clipboard.");
    return;
  }

  Alert.alert("Share link", url);
};

export const sharePostLink = async (postId: string) => {
  const url = getPostShareUrl(postId);

  if (Platform.OS === "web") {
    await webShare(url);
    return url;
  }

  await Share.share({
    title: "Beer Snap",
    message: url,
    url
  });
  return url;
};
