import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useColorScheme } from "react-native";
import {
  darkTheme,
  lightTheme,
  theme,
  type Theme,
  type ThemeMode,
  type ThemePreference
} from "./theme";

const ThemeContext = createContext<Theme>(theme);
const ThemePreferenceContext = createContext<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleMode: () => void;
} | null>(null);

const STORAGE_KEY = "beer-snap-theme-preference";

export const ThemeProvider = ({
  children,
  value
}: {
  children: React.ReactNode;
  value?: Theme;
}) => {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // Theme persistence should not block app startup.
      });
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    AsyncStorage.setItem(STORAGE_KEY, nextPreference).catch(() => {
      // Ignore persistence failures and keep the in-memory preference.
    });
  }, []);

  const activeMode: ThemeMode =
    preference === "system"
      ? systemColorScheme === "light"
        ? "light"
        : "dark"
      : preference;

  const resolvedTheme = value ?? (activeMode === "light" ? lightTheme : darkTheme);

  const preferenceValue = useMemo(
    () => ({
      preference,
      setPreference,
      toggleMode: () =>
        setPreference(activeMode === "dark" ? "light" : "dark")
    }),
    [activeMode, preference, setPreference]
  );

  return (
    <ThemePreferenceContext.Provider value={preferenceValue}>
      <ThemeContext.Provider value={resolvedTheme}>{children}</ThemeContext.Provider>
    </ThemePreferenceContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return context;
};
