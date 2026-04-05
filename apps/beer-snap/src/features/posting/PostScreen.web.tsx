import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button, Text, useTheme } from "@beer-snap/ui";
import { createPost, uploadPostImage } from "@beer-snap/data";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Image } from "expo-image";
import { useCurrentUserProfile } from "../../hooks/useCurrentUserProfile";
import { APP_CONTENT_MAX_WIDTH } from "../../components/layout";

type WebSelection = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

const selectImageFile = () =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.width = "1px";
    input.style.height = "1px";
    document.body.appendChild(input);

    const cleanup = () => {
      input.onchange = null;
      input.remove();
    };

    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      cleanup();
      resolve(file);
    };

    input.oncancel = () => {
      cleanup();
      resolve(null);
    };

    input.click();
  });

const readImageMetadata = (file: File) =>
  new Promise<WebSelection>((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      resolve({
        file,
        previewUrl,
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Unable to read that image."));
    };

    image.src = previewUrl;
  });

const compressForUpload = (file: File) =>
  new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const targetWidth = Math.min(1080, image.naturalWidth);
      const scale = targetWidth / image.naturalWidth;
      const targetHeight = Math.round(image.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to prepare that image."));
        return;
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Unable to compress that image."));
            return;
          }
          resolve({
            blob,
            width: targetWidth,
            height: targetHeight
          });
        },
        "image/jpeg",
        0.82
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to open that image."));
    };

    image.src = objectUrl;
  });

export const PostScreen = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { applyProfileDelta } = useCurrentUserProfile();
  const [selection, setSelection] = useState<WebSelection | null>(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (selection?.previewUrl) {
        URL.revokeObjectURL(selection.previewUrl);
      }
    };
  }, [selection]);

  const chooseImage = async () => {
    setFeedback(null);
    const file = await selectImageFile();
    if (!file) return;

    try {
      const nextSelection = await readImageMetadata(file);
      setSelection((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl);
        }
        return nextSelection;
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to open that image.");
    }
  };

  const reset = () => {
    setSelection((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
    setFeedback(null);
  };

  const upload = async () => {
    if (!selection || !user) return;

    setUploading(true);
    setFeedback(null);

    try {
      const compressed = await compressForUpload(selection.file);
      const path = await uploadPostImage(supabase, {
        userId: user.id,
        filePath: `${Date.now()}.jpg`,
        fileData: compressed.blob,
        contentType: "image/jpeg"
      });

      await createPost(supabase, {
        userId: user.id,
        imagePath: path,
        imageWidth: compressed.width,
        imageHeight: compressed.height
      });
      applyProfileDelta({ postDelta: 1 });

      reset();
      setUploading(false);
      router.replace("/feed");
      return;
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to publish right now.");
      setUploading(false);
      return;
    }
  };

  if (!user) {
    return (
      <View style={styles.centered(colors.bg)}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
          Sign in to post
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: "center", marginBottom: 16 }}>
          Beer Snap posts are always public in v1.
        </Text>
        <Button label="Sign in" onPress={() => router.push("/auth")} />
      </View>
    );
  }

  if (selection) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Image
          source={{ uri: selection.previewUrl }}
          contentFit="cover"
          style={{ flex: 1 }}
        />
        <Pressable
          onPress={() => router.back()}
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.55)"
          }}
        >
          <Feather name="x" size={20} color={colors.text} />
        </Pressable>
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 20,
            borderRadius: 24,
            padding: 16,
            backgroundColor: "rgba(11,11,11,0.84)",
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 6 }}>
            Ready to share
          </Text>
          <Text style={{ color: colors.textMuted, marginBottom: 12 }}>
            {selection.width} x {selection.height} • public post
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button label="Choose another" variant="ghost" onPress={reset} />
            <Button label={uploading ? "Publishing..." : "Post"} onPress={uploading ? undefined : upload} />
          </View>
          {uploading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              <ActivityIndicator color={colors.accent} />
              <Text style={{ color: colors.textMuted }}>Compressing and uploading…</Text>
            </View>
          ) : null}
          {feedback ? (
            <Text style={{ color: colors.danger, marginTop: 12 }}>{feedback}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.centered(colors.bg)}>
      <View
        style={{
          width: "100%",
          maxWidth: Math.min(APP_CONTENT_MAX_WIDTH, 520),
          borderRadius: 28,
          padding: 24,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>
          Post a beer photo
        </Text>
        <Text style={{ color: colors.textMuted, marginBottom: 20 }}>
          Choose one portrait photo. We&apos;ll compress it before upload and publish it publicly.
        </Text>
        <Button label="Choose image" onPress={chooseImage} />
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 14 }}>
          No captions. No private posts. Just the pour.
        </Text>
        {feedback ? (
          <Text style={{ color: colors.danger, marginTop: 12 }}>{feedback}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = {
  centered: (backgroundColor: string) => ({
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
    backgroundColor
  })
};
