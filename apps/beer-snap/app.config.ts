import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const cleanEnv = (value?: string) => value?.trim();

const config: ExpoConfig = {
  name: "Beer Snap",
  slug: "beer-snap",
  scheme: "beer-snap",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.beersnap.app"
  },
  android: {
    package: "com.beersnap.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0B0B"
    }
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png"
  },
  extra: {
    siteUrl: cleanEnv(process.env.EXPO_PUBLIC_SITE_URL) ?? "https://beer.rawert.xyz",
    supabaseUrl: cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseApiKey:
      cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
      cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    expoProjectId: cleanEnv(process.env.EXPO_PUBLIC_EXPO_PROJECT_ID)
  },
  experiments: {
    // In SDK 54 monorepos, this keeps Metro aligned with the native module graph.
    autolinkingModuleResolution: true
  },
  plugins: ["expo-router"]
};

export default config;
