import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UserProfile } from "@beer-snap/domain";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

type ProfileDelta = {
  postDelta?: number;
  followerDelta?: number;
  followingDelta?: number;
};

type CurrentUserProfileContextValue = {
  profile: UserProfile | null;
  setProfile: Dispatch<SetStateAction<UserProfile | null>>;
  refreshProfile: () => Promise<UserProfile | null>;
  applyProfileDelta: (delta: ProfileDelta) => void;
};

const CurrentUserProfileContext = createContext<
  CurrentUserProfileContextValue | undefined
>(undefined);

const clampCount = (value: number) => Math.max(value, 0);

const mapRowToProfile = (data: Record<string, any>): UserProfile => ({
  id: data.id,
  handle: data.handle,
  displayName: data.display_name,
  avatarUrl: data.avatar_url,
  bio: data.bio,
  createdAt: data.created_at,
  status: data.status,
  postCount: data.post_count_cache,
  followerCount: data.follower_count_cache,
  followingCount: data.following_count_cache
});

export const CurrentUserProfileProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const nextProfile = data ? mapRowToProfile(data) : null;
    setProfile(nextProfile);
    return nextProfile;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    refreshProfile().catch((error) => {
      console.warn("Unable to refresh current profile", error);
    });
  }, [refreshProfile, user]);

  const applyProfileDelta = useCallback((delta: ProfileDelta) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            postCount: clampCount(current.postCount + (delta.postDelta ?? 0)),
            followerCount: clampCount(
              current.followerCount + (delta.followerDelta ?? 0)
            ),
            followingCount: clampCount(
              current.followingCount + (delta.followingDelta ?? 0)
            )
          }
        : current
    );
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      refreshProfile,
      applyProfileDelta
    }),
    [applyProfileDelta, profile, refreshProfile]
  );

  return (
    <CurrentUserProfileContext.Provider value={value}>
      {children}
    </CurrentUserProfileContext.Provider>
  );
};

export const useCurrentUserProfile = () => {
  const context = useContext(CurrentUserProfileContext);
  if (!context) {
    throw new Error(
      "useCurrentUserProfile must be used within CurrentUserProfileProvider"
    );
  }
  return context;
};
