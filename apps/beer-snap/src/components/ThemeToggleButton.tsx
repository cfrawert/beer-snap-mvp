import React from "react";
import { Feather } from "@expo/vector-icons";
import { IconButton, useTheme, useThemePreference } from "@beer-snap/ui";

export const ThemeToggleButton = () => {
  const { colors, mode } = useTheme();
  const { toggleMode } = useThemePreference();

  return (
    <IconButton
      onPress={toggleMode}
      icon={
        <Feather
          name={mode === "dark" ? "sun" : "moon"}
          size={17}
          color={colors.text}
        />
      }
      size={38}
    />
  );
};
