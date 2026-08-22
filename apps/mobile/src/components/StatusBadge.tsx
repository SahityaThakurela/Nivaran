import { StyleSheet, Text, View } from "react-native";
import type { ReportStatus } from "../api/types";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
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

type TFn = (key: TranslationKey) => string;

function stylesForStatus(status: ReportStatus | string, t: TFn): BadgeStyle {
  switch (status) {
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "ACKNOWLEDGED":
      return {
        bg: colors.statusProgressBg,
        dot: colors.statusProgressDot,
        text: colors.statusProgressText,
        label: t("status.inProgress"),
      };
    case "RESOLVED":
      return {
        bg: colors.statusResolvedBg,
        dot: colors.statusResolvedDot,
        text: colors.statusResolvedText,
        label: t("status.resolved"),
      };
    case "SUBMITTED":
      return {
        bg: colors.softBlue,
        dot: colors.brandBlueDeep,
        text: colors.brandBlueDeep,
        label: t("status.pending"),
      };
    case "REJECTED":
      return {
        bg: colors.unresolvedBg,
        dot: colors.danger,
        text: colors.unresolvedText,
        label: t("status.rejected"),
      };
    case "DUPLICATE":
      return {
        bg: colors.softBlueAlt,
        dot: colors.bodyMuted,
        text: colors.bodyMuted,
        label: t("status.duplicate"),
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
  const { t } = useLanguage();
  const s = stylesForStatus(status, t);
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
