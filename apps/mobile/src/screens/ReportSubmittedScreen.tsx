import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report, Severity } from "../api/types";
import { getIssue } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { Icon } from "../components/Icon";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "ReportSubmitted">;
type Route = RouteProp<RootStackParamList, "ReportSubmitted">;

const SUCCESS_GREEN = "#7CF994";
const SUCCESS_CHECK = "#007230";
const STATUS_PILL_BG = "rgba(153, 97, 0, 0.1)";
const STATUS_PILL_TEXT = "#784B00";
const CARD_BORDER = "rgba(225, 232, 255, 0.5)";

function formatReportId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 4) return `#NV-${digits.slice(-4)}`;
  return `#NV-${id.slice(-4).toUpperCase()}`;
}

function stripCategoryPrefix(description: string): string {
  return description.replace(/^\[[A-Z_]+\]\s*/, "").trim();
}

/** Prefer nav param (user pick), then API domain, then `[DOMAIN]` prefix. */
function resolveDomain(
  report: Report | null,
  paramDomain?: string,
): string | null {
  const fromParam = paramDomain?.trim();
  if (fromParam) return fromParam;

  if (report?.domain?.trim()) return report.domain.trim();

  const match = report?.description?.match(/^\[([A-Z_]+)\]/);
  if (match?.[1]) return match[1];

  return null;
}

function priorityMeta(severity: Severity | null): {
  labelKey: TranslationKey;
  color: string;
} {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return { labelKey: "submitted.priorityHigh", color: colors.severityHigh };
  }
  if (severity === "LOW") {
    return { labelKey: "submitted.priorityLow", color: colors.severityLow };
  }
  return { labelKey: "submitted.priorityMedium", color: colors.severityMed };
}

function universityForDomain(domain: string | null): string {
  switch (domain) {
    case "EDUCATION":
    case "PUBLIC_ADMINISTRATION":
    case "RURAL_LIVELIHOODS":
      return "a partner university in your district";
    case "HEALTHCARE":
      return "a medical sciences institute in your district";
    case "AGRICULTURE":
    case "WATER_RESOURCES":
      return "an agricultural research university in your district";
    case "ENVIRONMENT":
    case "ENERGY":
    case "URBAN_DEVELOPMENT":
      return "a technical institute in your district";
    case "ACCESSIBILITY":
      return "a partner university in your district";
    default:
      return "a relevant university in your district";
  }
}

/**
 * Post-submit success — Figma node 166:19797
 * https://www.figma.com/design/3E7u19RAWuvovgVt8DIw8v/mp--Copy-?node-id=166-19797
 */
export function ReportSubmittedScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token } = useAuth();
  const { t, domainLabel } = useLanguage();
  const { issueId, domain: paramDomain } = route.params;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedDomain = useMemo(
    () => resolveDomain(report, paramDomain),
    [report, paramDomain],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError(t("submitted.notSignedIn"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getIssue(token, issueId);
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("submitted.failedLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, issueId, t]);

  const priority = useMemo(
    () => priorityMeta(report?.severity ?? null),
    [report?.severity],
  );

  const description = useMemo(
    () => (report ? stripCategoryPrefix(report.description) : ""),
    [report],
  );

  const aiBody = useMemo(() => {
    if (!report) return "";
    if (report.aiSummary?.trim()) return report.aiSummary.trim();
    return t("submitted.aiBody", {
      department: universityForDomain(resolvedDomain),
    });
  }, [report, resolvedDomain, t]);

  function goHome() {
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }

  function goTrack() {
    navigation.replace("TrackIssue", { issueId, animateTimeline: true });
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title={t("submitted.title")}
        onBack={goHome}
        showActions={false}
      />

      {loading ? (
        <ActivityIndicator color={colors.brandBlueDeep} style={{ marginTop: 48 }} />
      ) : error || !report ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error ?? t("submitted.notFound")}</Text>
          <AppButton label={t("submitted.backHome")} onPress={goHome} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.ringOuter}>
              <View style={styles.ringMid}>
                <View style={styles.ringInner}>
                  <Icon
                    name="confirm_check"
                    width={28}
                    height={22}
                    color={SUCCESS_CHECK}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.heroTitle}>{t("submitted.heading")}</Text>
            <Text style={styles.heroSub}>{t("submitted.subtitle")}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>{t("submitted.reportId")}</Text>
              <Text style={styles.idValue}>{formatReportId(report.id)}</Text>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>{t("submitted.category")}</Text>
                <Text style={styles.metaValue}>
                  {resolvedDomain
                    ? domainLabel(resolvedDomain)
                    : t("common.notSet")}
                </Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>{t("submitted.priority")}</Text>
                <View style={styles.priorityRow}>
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: priority.color },
                    ]}
                  />
                  <Text style={styles.metaValue}>{t(priority.labelKey)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statusBlock}>
              <Text style={styles.metaLabel}>{t("submitted.status")}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {t("submitted.pendingReview")}
                </Text>
              </View>
            </View>

            {description ? (
              <View style={styles.descriptionBlock}>
                <Text style={styles.metaLabel}>{t("submitted.description")}</Text>
                <Text style={styles.descriptionText}>{description}</Text>
              </View>
            ) : null}

            <View style={styles.aiBox}>
              <View style={styles.aiIcon}>
                <Icon name="sparkle" width={16} height={16} color={colors.white} />
              </View>
              <View style={styles.aiCopy}>
                <Text style={styles.aiTitle}>{t("submitted.aiTitle")}</Text>
                <Text style={styles.aiBodyText}>{aiBody}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <AppButton label={t("submitted.trackReport")} onPress={goTrack} />
            <Pressable
              style={styles.secondaryBtn}
              onPress={goHome}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>{t("submitted.backHome")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  errorWrap: {
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: "center",
  },
  hero: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 8,
    gap: 12,
  },
  ringOuter: {
    width: 128,
    height: 128,
    borderRadius: 9999,
    backgroundColor: "rgba(124, 249, 148, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringMid: {
    width: 112,
    height: 112,
    borderRadius: 9999,
    backgroundColor: "rgba(124, 249, 148, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    backgroundColor: SUCCESS_GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: SUCCESS_GREEN,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  heroTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.32,
    color: colors.brandNavy,
    textAlign: "center",
  },
  heroSub: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 18,
    lineHeight: 29,
    color: colors.bodyMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 16,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
  },
  idLabel: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.7,
    color: colors.bodyMuted,
    textTransform: "uppercase",
  },
  idValue: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandBlueDeep,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 16,
  },
  metaCell: {
    flex: 1,
    gap: 8,
  },
  metaLabel: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.bodyMuted,
  },
  metaValue: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
  },
  statusBlock: {
    gap: 12,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: STATUS_PILL_BG,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 12,
    lineHeight: 17,
    color: STATUS_PILL_TEXT,
  },
  descriptionBlock: {
    gap: 8,
  },
  descriptionText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.brandNavy,
  },
  aiBox: {
    backgroundColor: colors.softBlue,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCopy: {
    flex: 1,
    gap: 7,
  },
  aiTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: colors.brandNavy,
  },
  aiBodyText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.bodyMuted,
  },
  actions: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 16,
  },
  secondaryBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  secondaryText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: colors.brandBlueDeep,
  },
});

