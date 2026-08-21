import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getHealth } from "../api/health";
import { useAuth } from "../auth/AuthContext";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { LogoMark, logoCardShadow } from "../components/LogoMark";
import { Tagline } from "../components/Tagline";
import { TrustMark } from "../components/TrustMark";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme/tokens";

type LandingStatus = "loading" | "ready" | "error";
type Nav = NativeStackNavigationProp<RootStackParamList, "Landing">;

/**
 * Splash / landing screen — Figma node 53:7070.
 * Calls GET /health while the loading bar runs (no mock data).
 */
export function LandingScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [progress, setProgress] = useState(0.12);
  const [status, setStatus] = useState<LandingStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const minDisplayMs = 1200;

    async function bootstrap() {
      try {
        setProgress(0.35);
        await getHealth();
        if (cancelled) return;
        setProgress(0.85);
        const elapsed = Date.now() - started;
        const wait = Math.max(0, minDisplayMs - elapsed);
        await new Promise((resolve) => setTimeout(resolve, wait));
        if (cancelled) return;
        setProgress(1);
        setStatus("ready");
        navigation.replace(token ? "Home" : "Auth");
      } catch {
        if (cancelled) return;
        setProgress(1);
        setStatus("error");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [navigation, token]);

  return (
    <View style={styles.screen} accessibilityLabel="Nivaran landing">
      <View style={styles.main}>
        <View style={styles.logoBlock}>
          <View style={[styles.glow, styles.glowOuter]} />
          <View style={[styles.glow, styles.glowInner]} />
          <View style={styles.logoCard}>
            <LogoMark />
          </View>
        </View>

        <View style={styles.trustWrap}>
          <TrustMark />
        </View>

        <View style={styles.typography}>
          <Text style={styles.brandName}>NIVARAN</Text>
          <Tagline />
        </View>

        <View style={styles.loadingWrap}>
          <LoadingIndicator progress={progress} />
        </View>

        {status === "error" ? (
          <Text style={styles.errorText}>
            Can’t reach the API. Is apps/api running on port 4000?
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    width: "100%",
    maxWidth: 384,
    alignItems: "center",
  },
  logoBlock: {
    width: spacing.logoSize,
    height: spacing.logoSize,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.logoToTrust,
  },
  glow: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: colors.glow,
  },
  // Approximate Figma blur(20px) + opacity 0.7 without a BlurView dependency.
  glowOuter: {
    top: -16,
    right: -16,
    bottom: -16,
    left: -16,
    opacity: 0.35,
  },
  glowInner: {
    top: -spacing.logoGlowInset,
    right: -spacing.logoGlowInset,
    bottom: -spacing.logoGlowInset,
    left: -spacing.logoGlowInset,
    opacity: 0.5,
  },
  logoCard: {
    width: spacing.logoSize,
    height: spacing.logoSize,
    borderRadius: spacing.logoRadius,
    padding: spacing.logoPadding,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...logoCardShadow,
  },
  trustWrap: {
    marginBottom: spacing.trustToTitle,
  },
  typography: {
    alignItems: "center",
    gap: spacing.typographyGap,
  },
  brandName: {
    ...typography.brandName,
    textAlign: "center",
  },
  loadingWrap: {
    marginTop: spacing.loadingTop,
    alignItems: "center",
  },
  errorText: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: colors.bodyMuted60,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
