import { StyleSheet, Text, View } from "react-native";
import type { ReportStatus } from "../api/types";
import { colors, fonts } from "../theme/tokens";

type StatusBadgeProps = {
  status: ReportStatus | string;
};

type BadgeStyle = {
  bg: string;
  dot: string;
  text: string;
  label: string;
};

function stylesForStatus(status: ReportStatus | string): BadgeStyle {
  switch (status) {
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "ACKNOWLEDGED":
      return {
        bg: colors.statusProgressBg,
        dot: colors.statusProgressDot,
        text: colors.statusProgressText,
        label: "In Progress",
      };
    case "RESOLVED":
      return {
        bg: colors.statusResolvedBg,
        dot: colors.statusResolvedDot,
        text: colors.statusResolvedText,
        label: "Resolved",
      };
    case "SUBMITTED":
      return {
        bg: colors.softBlue,
        dot: colors.brandBlueDeep,
        text: colors.brandBlueDeep,
        label: "Pending",
      };
    default:
      return {
        bg: colors.softBlueAlt,
        dot: colors.bodyMuted,
        text: colors.bodyMuted,
        label: status.replace(/_/g, " "),
      };
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = stylesForStatus(status);
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.label, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 12,
    lineHeight: 16,
  },
});
