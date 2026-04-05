export const APP_CONTENT_MAX_WIDTH = 680;
export const APP_HORIZONTAL_PADDING = 16;
export const APP_LIST_BOTTOM_PADDING = 120;
export const APP_SECTION_GAP = 16;

export const APP_SHELL_STYLE = {
  width: "100%",
  maxWidth: APP_CONTENT_MAX_WIDTH,
  alignSelf: "center"
} as const;

export const APP_PADDED_SHELL_STYLE = {
  ...APP_SHELL_STYLE,
  paddingHorizontal: APP_HORIZONTAL_PADDING
} as const;

export const APP_LIST_CONTENT_STYLE = {
  paddingHorizontal: APP_HORIZONTAL_PADDING,
  paddingTop: 6,
  paddingBottom: APP_LIST_BOTTOM_PADDING
} as const;
