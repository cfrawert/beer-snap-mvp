import "react-native-url-polyfill/auto";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createSupabaseClient } from "@beer-snap/data";

const env = (
  globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  }
).process?.env;

const cleanEnv = (value?: string) => value?.trim();

const supabaseUrl =
  cleanEnv(Constants.expoConfig?.extra?.supabaseUrl as string | undefined) ??
  cleanEnv(env?.EXPO_PUBLIC_SUPABASE_URL) ??
  "";
const supabaseApiKey =
  cleanEnv(Constants.expoConfig?.extra?.supabaseApiKey as string | undefined) ??
  cleanEnv(env?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
  cleanEnv(env?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
  "";

if (!supabaseUrl || !supabaseApiKey) {
  console.warn(
    "Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createSupabaseClient({
  url: supabaseUrl,
  apiKey: supabaseApiKey,
  storage:
    Platform.OS === "web" && typeof window === "undefined"
      ? undefined
      : AsyncStorage
});
