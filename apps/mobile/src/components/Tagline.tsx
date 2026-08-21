import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme/tokens";

/**
 * Tagline row from Figma nodes 53:7082–53:7090.
 * Exact order: Report. · Resolve. · Improve.
 */
export function Tagline() {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Text style={[styles.text, typography.taglineActive, styles.activeShadow]}>
        Report.
      </Text>
      <View style={styles.dot} />
      <Text style={[styles.text, typography.tagline]}>Resolve.</Text>
      <View style={styles.dot} />
      <Text style={[styles.text, typography.tagline]}>Improve.</Text>
    </View>
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
