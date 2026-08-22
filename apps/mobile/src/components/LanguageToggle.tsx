import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../i18n/LanguageContext";
import type { Locale } from "../i18n/translations";
import { colors, fonts } from "../theme/tokens";

/** Figma 153:15713 — EN / हिंदी pill toggle */
export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <View style={styles.track} accessibilityRole="tablist">
      <Segment
        label="EN"
        active={locale === "en"}
        onPress={() => setLocale("en")}
      />
      <Segment
        label="हिंदी"
        active={locale === "hi"}
        onPress={() => setLocale("hi")}
      />
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, active ? styles.segmentActive : null]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label === "EN" ? "English" : "Hindi"}
    >
      <Text style={[styles.label, active ? styles.labelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact toggle for auth / non-header surfaces */
export function LanguageToggleCompact() {
  const { locale, setLocale } = useLanguage();
  const next: Locale = locale === "en" ? "hi" : "en";

  return (
    <Pressable
      onPress={() => setLocale(next)}
      style={styles.compact}
      accessibilityLabel={
        locale === "en" ? "Switch to Hindi" : "Switch to English"
      }
    >
      <Text style={styles.compactText}>{locale === "en" ? "EN" : "हिंदी"}</Text>
      <Text style={styles.compactSep}>/</Text>
      <Text style={[styles.compactText, styles.compactMuted]}>
        {locale === "en" ? "हिंदी" : "EN"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    paddingHorizontal: 4,
    borderRadius: 9999,
    backgroundColor: colors.softBlue,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  segmentActive: {
    backgroundColor: colors.heroBlue,
  },
  label: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.bodyMuted,
    textAlign: "center",
  },
  labelActive: {
    color: colors.white,
  },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: colors.softBlue,
  },
  compactText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 12,
    color: colors.heroBlue,
  },
  compactMuted: {
    color: colors.bodyMuted,
    fontFamily: fonts.Inter_400Regular,
  },
  compactSep: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    color: colors.bodyMuted,
  },
});
