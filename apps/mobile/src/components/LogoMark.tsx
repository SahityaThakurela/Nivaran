import { Image } from "react-native";
import { colors, spacing } from "../theme/tokens";

type LogoMarkProps = {
  size?: number;
};

/**
 * Brand logo mark from Figma node 53:7098 (exported asset).
 * Sized to sit inside the soft-glow card (112×112 inside 160×160).
 */
export function LogoMark({ size = spacing.logoImageSize }: LogoMarkProps) {
  return (
    <Image
      source={require("../../assets/images/logo.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Nivaran"
    />
  );
}

export const logoCardShadow = {
  shadowColor: "#2563EB",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 32,
  elevation: 8,
  backgroundColor: colors.logoCard,
} as const;
