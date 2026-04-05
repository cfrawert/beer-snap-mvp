export const MAGIC_LINK_COOLDOWN_MS = 10_000;
export const MAGIC_LINK_STORAGE_KEY = "beer-snap:last-magic-link-sent-at";

export const normalizeMagicLinkEmail = (value: string) =>
  value.trim().toLowerCase();

export const getMagicLinkCooldownRemaining = (
  lastSentAt: number | null,
  now = Date.now()
) => {
  if (!lastSentAt) return 0;
  return Math.max(
    0,
    Math.ceil((lastSentAt + MAGIC_LINK_COOLDOWN_MS - now) / 1000)
  );
};

export const mapMagicLinkError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unable to send a magic link.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("security purposes") ||
    normalized.includes("60 seconds") ||
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("rate limit")
  ) {
    return "We just sent a link. Wait a few seconds before requesting another one.";
  }

  return message;
};
