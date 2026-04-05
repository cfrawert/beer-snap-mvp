import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { toggleFollow } from "@beer-snap/data";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useCurrentUserProfile } from "./CurrentUserProfileContext";
import { applyFollowingStatus } from "../features/following/followState";

type FollowingContextValue = {
  followingIds: string[];
  isFollowing: (userId: string) => boolean;
  refreshFollowingIds: () => Promise<string[]>;
  setFollowingStatus: (userId: string, shouldFollow: boolean) => void;
  toggleFollowUser: (
    userId: string,
    shouldFollow?: boolean
  ) => Promise<boolean>;
};

const FollowingContext = createContext<FollowingContextValue | undefined>(
  undefined
);

export const FollowingProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const { applyProfileDelta } = useCurrentUserProfile();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const followingIdsRef = useRef<string[]>([]);

  useEffect(() => {
    followingIdsRef.current = followingIds;
  }, [followingIds]);

  const refreshFollowingIds = useCallback(async () => {
    if (!user) {
      setFollowingIds([]);
      return [];
    }

    const { data, error } = await supabase
      .from("follows")
      .select("followed_user_id")
      .eq("follower_user_id", user.id);

    if (error) {
      throw error;
    }

    const nextIds = (data ?? []).map((row) => row.followed_user_id);
    setFollowingIds(nextIds);
    return nextIds;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setFollowingIds([]);
      return;
    }

    refreshFollowingIds().catch((error) => {
      console.warn("Unable to refresh following ids", error);
    });
  }, [refreshFollowingIds, user]);

  const setFollowingStatus = useCallback(
    (userId: string, shouldFollow: boolean) => {
      setFollowingIds((current) =>
        applyFollowingStatus(current, userId, shouldFollow)
      );
    },
    []
  );

  const isFollowing = useCallback(
    (userId: string) => followingIds.includes(userId),
    [followingIds]
  );

  const toggleFollowUser = useCallback(
    async (followedUserId: string, shouldFollow?: boolean) => {
      if (!user) {
        throw new Error("Sign in to follow people.");
      }

      if (user.id === followedUserId) {
        throw new Error("You cannot follow yourself.");
      }

      const currentlyFollowing = followingIdsRef.current.includes(followedUserId);
      const nextShouldFollow =
        typeof shouldFollow === "boolean" ? shouldFollow : !currentlyFollowing;

      setFollowingStatus(followedUserId, nextShouldFollow);
      applyProfileDelta({ followingDelta: nextShouldFollow ? 1 : -1 });

      try {
        await toggleFollow(supabase, {
          followerUserId: user.id,
          followedUserId,
          shouldFollow: nextShouldFollow
        });
        return nextShouldFollow;
      } catch (error) {
        setFollowingStatus(followedUserId, !nextShouldFollow);
        applyProfileDelta({ followingDelta: nextShouldFollow ? -1 : 1 });
        throw error;
      }
    },
    [applyProfileDelta, setFollowingStatus, user]
  );

  const value = useMemo(
    () => ({
      followingIds,
      isFollowing,
      refreshFollowingIds,
      setFollowingStatus,
      toggleFollowUser
    }),
    [
      followingIds,
      isFollowing,
      refreshFollowingIds,
      setFollowingStatus,
      toggleFollowUser
    ]
  );

  return (
    <FollowingContext.Provider value={value}>
      {children}
    </FollowingContext.Provider>
  );
};

export const useFollowingIds = () => {
  const context = useContext(FollowingContext);
  if (!context) {
    throw new Error("useFollowingIds must be used within FollowingProvider");
  }
  return context;
};
