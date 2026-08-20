/**
 * Design tokens from Figma frame 53:7070 (Splash Screen).
 * Values match the file exactly — do not approximate.
 */
export const colors = {
  background: "#F9F9FF",
  brandNavy: "#121B2E",
  brandBlue: "#005FFF",
  brandBlueDeep: "#004AC6",
  bodyMuted: "#434655",
  bodyMuted60: "rgba(67, 70, 85, 0.6)",
  dot: "rgba(0, 74, 198, 0.4)",
  glow: "rgba(0, 74, 198, 0.2)",
  loadingTrack: "#D9E2FC",
  loadingFill: "#004AC6",
  logoCard: "#F9F9FF",
  white: "#FFFFFF",
} as const;

export const typography = {
  brandName: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.4,
    fontFamily: "Inter_600SemiBold",
    color: colors.brandNavy,
  },
  taglineActive: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.4,
    fontFamily: "Inter_500Medium",
    color: colors.brandBlue,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.4,
    fontFamily: "Inter_500Medium",
    color: colors.bodyMuted,
  },
  trustMark: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontFamily: "Inter_400Regular",
    color: colors.bodyMuted60,
  },
} as const;

export const spacing = {
  taglineGap: 8,
  typographyGap: 12,
  trustMarkGap: 8,
  logoPadding: 24,
  logoGlowInset: 8,
  loadingWidth: 48,
  loadingHeight: 4,
  logoSize: 160,
  logoImageSize: 112,
  logoRadius: 32,
  trustIconWidth: 14.667,
  trustIconHeight: 14,
  /** Gap logo card → trust mark (Figma absolute positions). */
  logoToTrust: 52,
  /** Gap trust mark → brand title cluster. */
  trustToTitle: 36,
  /** Space above the loading bar (Loading Indicator:margin pt). */
  loadingTop: 64,
} as const;
