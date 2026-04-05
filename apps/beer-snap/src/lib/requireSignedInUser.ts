import type { Href, Router } from "expo-router";
import type { User } from "@supabase/supabase-js";

export const AUTH_ROUTE: Href = "/auth";

export const requireSignedInUser = (
  user: User | null,
  router: Router
): User | null => {
  if (user) {
    return user;
  }

  router.push(AUTH_ROUTE);
  return null;
};
