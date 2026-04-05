export const applyFollowingStatus = (
  followingIds: string[],
  targetUserId: string,
  shouldFollow: boolean
) => {
  if (shouldFollow) {
    return followingIds.includes(targetUserId)
      ? followingIds
      : [...followingIds, targetUserId];
  }

  return followingIds.filter((id) => id !== targetUserId);
};
