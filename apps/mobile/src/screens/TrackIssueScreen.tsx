import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import { formatCategoryLabel, formatRelativeTime } from "../utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList, "TrackIssue">;
type Route = RouteProp<RootStackParamList, "TrackIssue">;

type TimelineStep = {
  key: string;
  label: string;
  at?: string;
  state: "done" | "current" | "upcoming";
};

function buildTimeline(report: Report): TimelineStep[] {
  const status = report.status;
  const steps: { key: string; label: string; include: boolean; at?: string }[] = [
    {
      key: "submitted",
      label: "Submitted",
      include: true,
      at: report.createdAt,
    },
    {
      key: "triaged",
      label: "Triaged by AI",
      include: !!report.category,
      at: report.updatedAt,
    },
    {
      key: "assigned",
      label: "Assigned",
      include: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"].includes(status),
    },
    {
      key: "in_progress",
      label: "In Progress",
      include: ["IN_PROGRESS", "RESOLVED"].includes(status),
    },
    {
      key: "resolved",
      label: "Resolved",
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
  const { issueId } = route.params;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError("Not signed in");
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
          setError(e instanceof Error ? e.message : "Failed to load issue");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, issueId]);

  const timeline = useMemo(
    () => (report ? buildTimeline(report) : []),
    [report],
  );

  function onNav(tab: NavTab) {
    if (tab === "home") {
      navigation.navigate("Home");
      return;
    }
    if (tab === "report") {
      navigation.navigate("Capture");
    }
  }

  const heroSource = report?.photoUrls[0]
    ? { uri: report.photoUrls[0] }
    : require("../../assets/images/track-hero.png");

  const sev = severityLabel(report?.severity ?? null);

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title="Track Issue"
        onBack={() => navigation.navigate("Home")}
      />

      {loading ? (
        <ActivityIndicator
          color={colors.brandBlueDeep}
          style={{ marginTop: 40 }}
        />
      ) : error || !report ? (
        <Text style={styles.error}>{error ?? "Issue not found"}</Text>
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
            {report.category
              ? formatCategoryLabel(report.category)
              : "Issue"}
          </Text>
          <Text style={styles.address}>
            {report.address ?? "Location pending"}
          </Text>

          {report.isDuplicate && report.duplicateOfId ? (
            <View style={styles.relatedCard}>
              <Text style={styles.relatedTitle}>Related Issue</Text>
              <Text style={styles.relatedBody}>
                This report was marked as a duplicate of an existing issue.
              </Text>
              <Pressable
                style={styles.relatedBtn}
                onPress={() =>
                  navigation.navigate("TrackIssue", {
                    issueId: report.duplicateOfId!,
                  })
                }
              >
                <Text style={styles.relatedBtnText}>View Master Issue</Text>
              </Pressable>
            </View>
          ) : null}

          {report.aiSummary || report.category ? (
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Icon name="sparkle" width={18} height={18} />
                <Text style={styles.aiTitle}>AI Insight</Text>
              </View>
              {report.category ? (
                <Text style={styles.aiMeta}>
                  Category: {formatCategoryLabel(report.category)}
                  {report.severity ? ` · Severity: ${report.severity}` : ""}
                </Text>
              ) : null}
              {report.aiSummary ? (
                <Text style={styles.aiQuote}>“{report.aiSummary}”</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Timeline</Text>
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
                      {formatRelativeTime(step.at)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
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
});
