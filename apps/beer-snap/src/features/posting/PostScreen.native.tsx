import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button, Text, useTheme } from "@beer-snap/ui";
import { createPost, uploadPostImage } from "@beer-snap/data";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Image } from "expo-image";
import { useCurrentUserProfile } from "../../hooks/useCurrentUserProfile";

export const PostScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const router = useRouter();
  const { user } = useAuth();
  const { applyProfileDelta } = useCurrentUserProfile();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}> 
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 10 }}>Sign in to post</Text>
          <Text style={{ marginBottom: 16, color: colors.textMuted, lineHeight: 22 }}>
            Open the camera, take one beer photo, and publish it immediately.
          </Text>
          <Button label="Sign in" onPress={() => router.push("/auth")} />
        </View>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}> 
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 10 }}>Camera access</Text>
          <Text style={{ marginBottom: 16, color: colors.textMuted, lineHeight: 22 }}>
            Beer Snap is camera-first. Enable camera access to post from your phone.
          </Text>
          <Button label="Enable camera" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  const capture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
    if (photo?.uri) {
      setCapturedUri(photo.uri);
    }
  };

  const reset = () => setCapturedUri(null);

  const upload = async () => {
    if (!capturedUri) return;
    setUploading(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        capturedUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      const filename = `${Date.now()}.jpg`;

      const path = await uploadPostImage(supabase, {
        userId: user.id,
        filePath: filename,
        fileData: blob,
        contentType: "image/jpeg"
      });

      await createPost(supabase, {
        userId: user.id,
        imagePath: path,
        imageWidth: manipulated.width ?? 1080,
        imageHeight: manipulated.height ?? 1350
      });
      applyProfileDelta({ postDelta: 1 });

      router.back();
    } finally {
      setUploading(false);
      setCapturedUri(null);
    }
  };

  if (capturedUri) {
    return (
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: capturedUri }}
          contentFit="cover"
          style={styles.previewImage}
        />
        <View style={[styles.previewOverlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18, paddingHorizontal: compact ? 16 : 20 }]}> 
          <View style={styles.previewTop}>
            <Button label="Retake" onPress={reset} variant="ghost" />
          </View>
          <View style={[styles.previewBottomCard, { backgroundColor: "rgba(8,8,8,0.78)", borderColor: colors.border }]}> 
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 6 }}>Ready to share</Text>
            <Text style={{ color: colors.textMuted, marginBottom: 14 }}>
              One public beer photo. No caption. Straight to the feed.
            </Text>
            <Button label={uploading ? "Sharing..." : "Share post"} onPress={uploading ? undefined : upload} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View
        style={[
          styles.captureHud,
          {
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 22,
            paddingHorizontal: compact ? 16 : 20
          }
        ]}
      >
        <View style={styles.topActions}>
          <Pressable
            style={[styles.close, { backgroundColor: "rgba(0,0,0,0.42)", borderColor: "rgba(255,255,255,0.12)" }]}
            onPress={() => router.back()}
          >
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.bottomActions}>
          <View style={[styles.captureMeta, { backgroundColor: "rgba(0,0,0,0.42)", borderColor: "rgba(255,255,255,0.12)" }]}> 
            <Text style={{ fontSize: 12, color: colors.textMuted }}>CAMERA</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 2 }}>Frame the beer and tap once</Text>
          </View>
          <Pressable onPress={capture} style={styles.captureButton}>
            <View style={styles.captureInner} />
          </Pressable>
          <View style={{ width: 108 }} />
        </View>
      </View>
      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={{ marginTop: 8 }}>Uploading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  panel: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 28,
    padding: 20
  },
  captureHud: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between"
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  bottomActions: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  captureMeta: {
    width: 108,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: "#F7F7F4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.16)"
  },
  captureInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#F7F7F4"
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)"
  },
  close: {
    padding: 10,
    borderRadius: 18,
    borderWidth: 1
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#0B0B0B"
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject
  },
  previewOverlay: {
    flex: 1,
    justifyContent: "space-between"
  },
  previewTop: {
    alignItems: "flex-start"
  },
  previewBottomCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16
  }
});
