/**
 * Shared tab navigation helper used by main tab screens.
 */
import type { NavTab } from "../components/BottomNav";

type TabNavigator = {
  navigate: (
    name: "Capture" | "Home" | "MyReports" | "Nearby" | "Profile",
  ) => void;
};

export function handleTabNavigate(
  navigation: TabNavigator,
  tab: NavTab,
  current: NavTab,
) {
  if (tab === current) return;
  if (tab === "report") {
    navigation.navigate("Capture");
    return;
  }
  if (tab === "home") {
    navigation.navigate("Home");
    return;
  }
  if (tab === "reports") {
    navigation.navigate("MyReports");
    return;
  }
  if (tab === "nearby") {
    navigation.navigate("Nearby");
    return;
  }
  if (tab === "profile") {
    navigation.navigate("Profile");
  }
}
