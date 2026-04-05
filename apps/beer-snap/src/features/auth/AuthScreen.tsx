import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, useTheme } from "@beer-snap/ui";
import { APP_CONTENT_MAX_WIDTH } from "../../components/layout";
import { ThemeToggleButton } from "../../components/ThemeToggleButton";
import { useAuth } from "../../lib/auth";
import {
  getMagicLinkCooldownRemaining,
  MAGIC_LINK_STORAGE_KEY,
  mapMagicLinkError,
  normalizeMagicLinkEmail
} from "./magicLink";

const NATIVE_MAIL_APPS = Platform.select({
  ios: [
    { label: "Open Mail", url: "message://" },
    { label: "Open Gmail", url: "googlegmail://" }
  ],
  android: [{ label: "Open Gmail", url: "googlegmail://" }],
  default: []
}) ?? [];

const onboardingPoints = [
  "Browse the public feed without an account.",
  "Sign in only when you want to post, react, follow, or manage your profile.",
  "Every upload is public in Beer Snap v1."
];

export const AuthScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const storedValue = window.localStorage.getItem(MAGIC_LINK_STORAGE_KEY);
      return storedValue ? Number(storedValue) : null;
    }
    return null;
  });
  const [timeTick, setTimeTick] = useState(Date.now());
  const [availableMailApps, setAvailableMailApps] = useState<{ label: string; url: string }[]>([]);

  const cooldownRemaining = getMagicLinkCooldownRemaining(lastSentAt, timeTick);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/feed");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (Platform.OS === "web" || !emailSent) {
      setAvailableMailApps([]);
      return;
    }

    let active = true;

    const detectMailApps = async () => {
      const checks = await Promise.all(
        NATIVE_MAIL_APPS.map(async (app) => ({
          app,
          supported: await Linking.canOpenURL(app.url).catch(() => false)
        }))
      );

      if (active) {
        setAvailableMailApps(
          checks.filter((item) => item.supported).map((item) => item.app)
        );
      }
    };

    detectMailApps();

    return () => {
      active = false;
    };
  }, [emailSent]);

  const rememberSentAt = (timestamp: number) => {
    setLastSentAt(timestamp);
    setTimeTick(timestamp);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(MAGIC_LINK_STORAGE_KEY, String(timestamp));
    }
  };

  const openMailApp = async (url: string, label: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        setFeedback(`${label} is not available on this device.`);
        return;
      }
      setFeedback(null);
      await Linking.openURL(url);
    } catch {
      setFeedback(`Unable to open ${label}. Open your inbox manually.`);
    }
  };

  const sendMagicLink = async () => {
    const normalizedEmail = normalizeMagicLinkEmail(email);
    if (!normalizedEmail) {
      setFeedback("Enter an email address to continue.");
      return;
    }

    if (cooldownRemaining > 0) {
      setFeedback(`Wait ${cooldownRemaining}s before requesting another link.`);
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      await signInWithEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setEmailSent(true);
      rememberSentAt(Date.now());
    } catch (error) {
      const message = mapMagicLinkError(error);
      setFeedback(message);
      if (message !== (error instanceof Error ? error.message : "")) {
        rememberSentAt(Date.now());
      }
    } finally {
      setSending(false);
    }
  };

  const submitIfReady = () => {
    if (!sending && cooldownRemaining <= 0) {
      void sendMagicLink();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 18) + 8,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
          justifyContent: "center",
          width: "100%",
          maxWidth: APP_CONTENT_MAX_WIDTH,
          alignSelf: "center"
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 14 }}>
            <ThemeToggleButton />
          </View>
          <Text style={{ fontSize: 30, fontWeight: "700", marginBottom: 8 }}>
            Beer Snap
          </Text>
          <Text style={{ color: colors.textMuted, marginBottom: 16 }}>
            Fast sign-in. Minimal setup. Straight to the camera and feed.
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              backgroundColor: colors.surface,
              padding: 18,
              gap: 10
            }}
          >
            {onboardingPoints.map((point) => (
              <Text key={point} style={{ color: colors.textMuted }}>
                - {point}
              </Text>
            ))}
          </View>
        </View>

        {emailSent ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              backgroundColor: colors.surface,
              padding: 20
            }}
          >
            <Text style={{ fontSize: Platform.OS === "ios" ? 22 : 20, fontWeight: "700", marginBottom: 8 }}>
              Check your inbox
            </Text>
            <Text style={{ color: colors.textMuted, marginBottom: 8 }}>
              We sent a magic link to {email}.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 16 }}>
              Open it on this device to finish sign-in. If you open it elsewhere, you can still come back here and refresh.
            </Text>
            <View
              style={{
                borderRadius: 18,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                marginBottom: 16
              }}
            >
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>
                Waiting for confirmation
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Keep this screen open. The app will route you back to the feed once the session is confirmed.
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                {cooldownRemaining > 0
                  ? `Resend available in ${cooldownRemaining}s.`
                  : "You can request another link now."}
              </Text>
            </View>
            {availableMailApps.length > 0 ? (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                {availableMailApps.map((app) => (
                  <View key={app.url} style={{ minWidth: 140, flexGrow: 1 }}>
                    <Button
                      label={app.label}
                      variant="ghost"
                      onPress={() => openMailApp(app.url, app.label)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
            <Button
              label={
                sending
                  ? "Sending..."
                  : cooldownRemaining > 0
                  ? `Resend in ${cooldownRemaining}s`
                  : "Resend link"
              }
              onPress={sending || cooldownRemaining > 0 ? undefined : sendMagicLink}
            />
            <View style={{ height: 12 }} />
            <Button
              label="Use a different email"
              variant="ghost"
              onPress={() => {
                setEmailSent(false);
                setFeedback(null);
              }}
            />
          </View>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              backgroundColor: colors.surface,
              padding: 20
            }}
          >
            <Text style={{ fontSize: Platform.OS === "ios" ? 22 : 20, fontWeight: "700", marginBottom: 8 }}>
              Sign in with email
            </Text>
            <Text style={{ color: colors.textMuted, marginBottom: 16 }}>
              One tap from your inbox. No password to remember.
            </Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={submitIfReady}
              onKeyPress={(event) => {
                if (Platform.OS === "web" && event.nativeEvent.key === "Enter") {
                  submitIfReady();
                }
              }}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: colors.text,
                marginBottom: 12
              }}
            />
            <Button
              label={sending ? "Sending..." : "Send magic link"}
              onPress={sending || cooldownRemaining > 0 ? undefined : sendMagicLink}
            />
            {cooldownRemaining > 0 ? (
              <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
                Another link can be sent in {cooldownRemaining}s.
              </Text>
            ) : null}
            <View style={{ height: 12 }} />
            <Button label="Browse feed first" variant="ghost" onPress={() => router.replace("/feed")} />
          </View>
        )}

        {feedback ? (
          <Text style={{ color: colors.danger, marginTop: 12, fontSize: 12 }}>
            {feedback}
          </Text>
        ) : null}

        <Text style={{ color: colors.textMuted, marginTop: 18, fontSize: 12 }}>
          By continuing you agree all uploads are public and beer-only.
        </Text>
        <Pressable onPress={() => router.push("/guidelines")}>
          <Text style={{ color: colors.accent, marginTop: 8, fontSize: 12 }}>
            View posting guidelines
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
