import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme/tokens";
import type { IconName } from "./iconAssets";
import { Icon } from "./Icon";

export type NavTab = "home" | "reports" | "nearby" | "profile" | "report";

type BottomNavProps = {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
};

const SIDE_TABS: {
  key: Exclude<NavTab, "report">;
  label: string;
  icon: IconName;
}[] = [
  { key: "home", label: "Home", icon: "nav_home" },
  { key: "reports", label: "Reports", icon: "nav_reports" },
  { key: "nearby", label: "Nearby", icon: "nav_nearby" },
  { key: "profile", label: "Profile", icon: "nav_profile" },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const left = SIDE_TABS.slice(0, 2);
  const right = SIDE_TABS.slice(2);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row}>
        {left.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            active={active === tab.key}
            onPress={() => onNavigate(tab.key)}
          />
        ))}

        <View style={styles.centerSlot}>
          <Pressable
            onPress={() => onNavigate("report")}
            style={({ pressed }) => [
              styles.reportBtn,
              pressed ? styles.pressed : null,
            ]}
            accessibilityLabel="Report"
          >
            <Icon name="nav_plus" width={20} height={20} color={colors.white} />
          </Pressable>
        </View>

        {right.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            active={active === tab.key}
            onPress={() => onNavigate(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const color = active ? "#004AC6" : "#434655";
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityLabel={label}>
      <Icon name={icon} width={20} height={20} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(249,249,255,0.95)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderMuted,
    paddingTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  tabLabel: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 11,
    lineHeight: 14,
  },
  centerSlot: {
    width: 72,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  reportBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    shadowColor: "#004AC6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  pressed: {
    opacity: 0.9,
  },
});
