export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const;

const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999
} as const;

const text = {
  h1: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: "600" as const, letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: "400" as const },
  small: { fontSize: 13, fontWeight: "400" as const }
} as const;

export const darkTheme = {
  mode: "dark" as const,
  colors: {
    bg: "#080808",
    surface: "#111113",
    surfaceElevated: "#16161A",
    card: "#18181C",
    border: "#26262C",
    overlay: "rgba(8,8,8,0.68)",
    overlayPressed: "rgba(8,8,8,0.84)",
    overlayBorder: "rgba(255,255,255,0.10)",
    text: "#F7F7F4",
    textMuted: "#9E9EA6",
    accent: "#F4C95D",
    accentSoft: "#2E2613",
    accentContrast: "#0B0B0B",
    danger: "#D95A6A",
    success: "#4DCB7A",
    successSoft: "#11301D"
  },
  spacing,
  radius,
  text
};

export const lightTheme = {
  mode: "light" as const,
  colors: {
    bg: "#F5F1E9",
    surface: "#FFFDF8",
    surfaceElevated: "#F6F0E6",
    card: "#FFFCF6",
    border: "#DED7CC",
    overlay: "rgba(255,252,246,0.78)",
    overlayPressed: "rgba(255,252,246,0.92)",
    overlayBorder: "rgba(43,37,25,0.10)",
    text: "#181511",
    textMuted: "#766F67",
    accent: "#D7A635",
    accentSoft: "#F3E4B8",
    accentContrast: "#181511",
    danger: "#C44B57",
    success: "#2E9156",
    successSoft: "#DCEFE3"
  },
  spacing,
  radius,
  text
};

export const theme = darkTheme;

export type Theme = typeof darkTheme | typeof lightTheme;
