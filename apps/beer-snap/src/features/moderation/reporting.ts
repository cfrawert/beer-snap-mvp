import { Alert } from "react-native";
import { reportPost } from "@beer-snap/data";
import type { SupabaseClient } from "@beer-snap/data";

const createReportAction = (
  supabase: SupabaseClient,
  {
    reporterUserId,
    postId,
    reasonCode
  }: {
    reporterUserId: string;
    postId: string;
    reasonCode: "not_beer" | "abuse";
  }
) => ({
  text: reasonCode === "not_beer" ? "Not beer" : "Abusive",
  onPress: () => {
    // Keep the alert actions thin and surface failures immediately.
    void reportPost(supabase, {
      reporterUserId,
      postId,
      reasonCode
    }).catch((error) => {
      Alert.alert(
        "Report failed",
        error instanceof Error ? error.message : "Please try again."
      );
    });
  }
});

export const promptToReportPost = (
  supabase: SupabaseClient,
  {
    reporterUserId,
    postId
  }: {
    reporterUserId: string;
    postId: string;
  }
) => {
  Alert.alert("Report post", "Why are you reporting this?", [
    createReportAction(supabase, {
      reporterUserId,
      postId,
      reasonCode: "not_beer"
    }),
    createReportAction(supabase, {
      reporterUserId,
      postId,
      reasonCode: "abuse"
    }),
    { text: "Cancel", style: "cancel" }
  ]);
};
