import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report, ReportStatus } from "../api/types";
import { getIssue } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import { StatusBadge } from "../components/StatusBadge";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import { formatRelativeTime } from "../utils/format";
import { pickRemotePhotoUrl } from "../utils/photoUrl";
import { verifiedStorageKey } from "../utils/notifications";

type Nav = NativeStackNavigationProp<RootStackParamList, "TrackIssue">;
type Route = RouteProp<RootStackParamList, "TrackIssue">;

type TimelineStep = {
  key: string;
  label: string;
  at?: string;
  state: "done" | "current" | "upcoming";
};

function buildTimeline(
  report: Report,
  t: (key: TranslationKey) => string,
): TimelineStep[] {
  const status = report.status;
  const steps: { key: string; label: string; include: boolean; at?: string }[] = [
    {
      key: "submitted",
      label: t("track.submitted"),
      include: true,
      at: report.createdAt,
    },
    {
      key: "triaged",
      label: t("track.triaged"),
      include: !!report.domain,
      at: report.updatedAt,
    },
    {
      key: "assigned",
      label: t("track.assignedShort"),
      include: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"].includes(status),
    },
    {
      key: "in_progress",
      label: t("track.inProgress"),
      include: ["IN_PROGRESS", "RESOLVED"].includes(status),
    },
    {
      key: "resolved",
      label: t("track.resolved"),
      include: status === "RESOLVED",
      at: status === "RESOLVED" ? report.updatedAt : undefined,
    },
  ];

  const included = steps.filter((s) => s.include);
  const currentIndex = included.length - 1;

  return included.map((s, i) => ({
    key: s.key,
    label: s.label,
    at: s.at,
    state: i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming",
  }));
}

function severityLabel(severity: string | null): string | null {
  if (!severity) return null;
  if (severity === "HIGH" || severity === "CRITICAL") return severity;
  return null;
}

export function TrackIssueScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token } = useAuth();
  const { t, domainLabel } = useLanguage();
  const { issueId } = route.params;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError(t("track.notSignedIn"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getIssue(token, issueId);
        if (!cancelled) setReport(data);
        const flag = await AsyncStorage.getItem(verifiedStorageKey(issueId));
        if (!cancelled) setVerified(flag === "1");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("track.failedLoad"));
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

  const timeline = useMemo(
    () => (report ? buildTimeline(report, t) : []),
    [report, t],
  );

  function onNav(tab: NavTab) {
    handleTabNavigate(navigation, tab, "reports");
  }

  const remotePhoto = pickRemotePhotoUrl(report?.photoUrls);
  const heroSource = remotePhoto
    ? { uri: remotePhoto }
    : require("../../assets/images/track-hero.png");

  const sev = severityLabel(report?.severity ?? null);

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title={t("track.title")}
        onBack={() => navigation.goBack()}
        onNotifications={() => navigation.navigate("Notifications")}
        onProfile={() => navigation.navigate("Profile")}
      />

      {loading ? (
        <ActivityIndicator
          color={colors.brandBlueDeep}
          style={{ marginTop: 40 }}
        />
      ) : error || !report ? (
        <Text style={styles.error}>{error ?? t("track.notFound")}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroWrap}>
            <ImageBackground source={heroSource} style={styles.hero} resizeMode="cover">
              <View style={styles.heroGradient} />
              <View style={styles.badgeRow}>
                <StatusBadge status={report.status as ReportStatus} />
                {sev ? (
                  <View style={styles.severityBadge}>
                    <Icon name="warning" width={14} height={12} />
                    <Text style={styles.severityText}>{sev}</Text>
                  </View>
                ) : null}
              </View>
            </ImageBackground>
          </View>

          <Text style={styles.title}>
            {report.domain ? domainLabel(report.domain) : t("common.issue")}
          </Text>
          <Text style={styles.address}>
            {report.address ?? t("common.locationPending")}
          </Text>

          {report.isDuplicate && report.duplicateOfId ? (
            <View style={styles.relatedCard}>
              <Text style={styles.relatedTitle}>{t("track.related")}</Text>
              <Text style={styles.relatedBody}>{t("track.relatedBody")}</Text>
              <Pressable
                style={styles.relatedBtn}
                onPress={() =>
                  navigation.navigate("TrackIssue", {
                    issueId: report.duplicateOfId!,
                  })
                }
              >
                <Text style={styles.relatedBtnText}>{t("track.viewMaster")}</Text>
              </Pressable>
            </View>
          ) : null}

          {report.aiSummary || report.domain ? (
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Icon name="sparkle" width={18} height={18} />
                <Text style={styles.aiTitle}>{t("track.aiInsight")}</Text>
              </View>
              {report.domain ? (
                <Text style={styles.aiMeta}>
                  {t("track.categoryMeta", {
                    category: domainLabel(report.domain),
                  })}
                  {report.severity
                    ? t("track.severityMeta", { severity: report.severity })
                    : ""}
                </Text>
              ) : null}
              {report.aiSummary ? (
                <Text style={styles.aiQuote}>“{report.aiSummary}”</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>{t("track.timeline")}</Text>
          <View style={styles.timeline}>
            {timeline.map((step, index) => (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.dot,
                      step.state === "done" && styles.dotDone,
                      step.state === "current" && styles.dotCurrent,
                    ]}
                  >
                    {step.state === "done" ? (
                      <Icon name="check" width={8} height={6} color={colors.white} />
                    ) : null}
                  </View>
                  {index < timeline.length - 1 ? (
                    <View style={styles.railLine} />
                  ) : null}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineLabel}>{step.label}</Text>
                  {step.at ? (
                    <Text style={styles.timelineAt}>
                      {formatRelativeTime(step.at, t)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {report.status === "RESOLVED" && !verified ? (
            <Pressable
              style={styles.verifyBtn}
              onPress={() =>
                navigation.navigate("VerifyResolution", { issueId: report.id })
              }
            >
              <Icon
                name="confirm_check"
                width={18}
                height={18}
                color={colors.white}
              />
              <Text style={styles.verifyBtnText}>{t("track.verifyCta")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}

      <BottomNav active="reports" onNavigate={onNav} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  error: {
    margin: 24,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.danger,
  },
  heroWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  hero: {
    width: "100%",
    height: 200,
    justifyContent: "flex-end",
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 27, 46, 0.35)",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.statusProgressBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  severityText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 12,
    color: colors.statusProgressText,
  },
  title: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  address: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
    marginTop: -4,
  },
  relatedCard: {
    backgroundColor: colors.relatedGreen,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  relatedTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    color: colors.relatedGreenText,
  },
  relatedBody: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.relatedGreenBody,
  },
  relatedBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.relatedGreenBtn,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  relatedBtnText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    color: colors.white,
  },
  aiCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.softBlueAlt,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    color: colors.brandNavy,
  },
  aiMeta: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    color: colors.brandBlueDeep,
  },
  aiQuote: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.bodyMuted,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
    marginTop: 8,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 48,
  },
  timelineRail: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.loadingTrack,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: {
    backgroundColor: colors.statusResolvedDot,
  },
  dotCurrent: {
    backgroundColor: colors.brandBlueDeep,
  },
  railLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.loadingTrack,
    marginVertical: 2,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  timelineAt: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.resolvedDark,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  verifyBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.white,
  },
});
