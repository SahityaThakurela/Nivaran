import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme/tokens";

export type TaglinePhase = "report" | "resolve" | "improve";

type TaglineProps = {
  /** Which word is highlighted — matches splash frames 53:7070 / 61:3 / 61:32. */
  active?: TaglinePhase;
};

/**
 * Tagline row from Figma splash screens.
 * Report. · Resolve. · Improve. — one word active at a time.
 */
export function Tagline({ active = "report" }: TaglineProps) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Word label="Report." active={active === "report"} />
      <View style={styles.dot} />
      <Word label="Resolve." active={active === "resolve"} />
      <View style={styles.dot} />
      <Word label="Improve." active={active === "improve"} />
    </View>
  );
}

function Word({ label, active }: { label: string; active: boolean }) {
  return (
    <Text
      style={[
        styles.text,
        active ? typography.taglineActive : typography.tagline,
        active ? styles.activeShadow : null,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.taglineGap,
  },
  text: {
    textAlign: "center",
  },
  activeShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 9999,
    backgroundColor: colors.dot,
  },
});
