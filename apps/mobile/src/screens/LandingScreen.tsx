import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getHealth } from "../api/health";
import { useAuth } from "../auth/AuthContext";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { LogoMark, logoCardShadow } from "../components/LogoMark";
import { Tagline, type TaglinePhase } from "../components/Tagline";
import { TrustMark } from "../components/TrustMark";
import { useLanguage } from "../i18n/LanguageContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, spacing, typography } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "Landing">;

const PHASES: TaglinePhase[] = ["report", "resolve", "improve"];
const PHASE_MS = 550;
const HEALTH_TIMEOUT_MS = 2500;
const MIN_DISPLAY_MS = PHASE_MS * PHASES.length;

/**
 * Splash sequence — Figma nodes 53:7070 → 61:3 → 61:32
 * (Report. → Resolve. → Improve.), then Auth or Home.
 * Health is best-effort; never block navigation on API failure.
 */
export function LandingScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0.12);
  const [phase, setPhase] = useState<TaglinePhase>("report");
  const [apiHint, setApiHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    let phaseIndex = 0;

    const phaseTimer = setInterval(() => {
      if (cancelled) return;
      phaseIndex = Math.min(phaseIndex + 1, PHASES.length - 1);
      setPhase(PHASES[phaseIndex]!);
      setProgress(0.2 + (phaseIndex + 1) * 0.25);
    }, PHASE_MS);

    async function bootstrap() {
      let healthOk = false;
      try {
        await Promise.race([
          getHealth()
            .then(() => {
              healthOk = true;
            })
            .catch(() => {
              /* best-effort */
            }),
          new Promise<void>((resolve) =>
            setTimeout(resolve, HEALTH_TIMEOUT_MS),
          ),
        ]);
      } catch {
        healthOk = false;
      }

      if (cancelled) return;

      if (!healthOk) {
        setApiHint(t("landing.apiOffline"));
      }

      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      await new Promise((resolve) => setTimeout(resolve, wait));
      if (cancelled) return;

      setPhase("improve");
      setProgress(1);
      clearInterval(phaseTimer);
      navigation.replace(token ? "Home" : "Auth");
    }

    void bootstrap();
    return () => {
      cancelled = true;
      clearInterval(phaseTimer);
    };
  }, [navigation, token, t]);

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
          <Tagline active={phase} />
        </View>

        <View style={styles.loadingWrap}>
          <LoadingIndicator progress={progress} />
        </View>

        {apiHint ? <Text style={styles.hintText}>{apiHint}</Text> : null}
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
  hintText: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: colors.bodyMuted60,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
