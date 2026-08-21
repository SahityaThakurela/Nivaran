import { Image, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "../theme/tokens";

/**
 * Footer trust mark from Figma nodes 53:7074–53:7078.
 */
export function TrustMark() {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Image
        source={require("../../assets/images/trust-mark.png")}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.label}>Civic Intelligence Platform</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.trustMarkGap,
  },
  icon: {
    width: spacing.trustIconWidth,
    height: spacing.trustIconHeight,
  },
  label: {
    ...typography.trustMark,
    textAlign: "center",
  },
});
