import React from "react";
import { ScrollView, View } from "react-native";
import { Text, useTheme } from "@beer-snap/ui";

export default function GuidelinesScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 20,
        width: "100%",
        maxWidth: 640,
        alignSelf: "center"
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        Posting Guidelines
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>
        Beer Snap is public by default. We keep the feed clean and beer-first.
      </Text>
      <Text style={{ marginBottom: 8 }}>- Only post photos of beer.</Text>
      <Text style={{ marginBottom: 8 }}>
        - No abusive, hateful, or explicit content.
      </Text>
      <Text style={{ marginBottom: 8 }}>
        - No private posts or hidden profiles in v1.
      </Text>
      <Text style={{ marginBottom: 8 }}>
        - Reports and heavy dislikes may remove posts.
      </Text>
      <Text style={{ marginBottom: 8 }}>
        - We may remove content that violates the rules.
      </Text>
    </ScrollView>
  );
}
