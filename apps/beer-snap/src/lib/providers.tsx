import React from "react";
import { ThemeProvider } from "@beer-snap/ui";
import { AuthProvider } from "./auth";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CurrentUserProfileProvider } from "../contexts/CurrentUserProfileContext";
import { FollowingProvider } from "../contexts/FollowingContext";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CurrentUserProfileProvider>
            <FollowingProvider>{children}</FollowingProvider>
          </CurrentUserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};
