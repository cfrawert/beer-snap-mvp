import { useLocalSearchParams } from "expo-router";
import { PublicProfileScreen } from "../../src/features/profiles/PublicProfileScreen";

export default function PublicProfileRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  if (!handle) return null;
  return <PublicProfileScreen handle={handle} />;
}
