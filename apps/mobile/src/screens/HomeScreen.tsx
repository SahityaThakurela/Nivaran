import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report, ReportCategory, ReportStatus } from "../api/types";
import { listIssues } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import {
  formatCategoryLabel,
  formatRelativeTime,
  greetingForNow,
} from "../utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

/** Figma 146:63 palette */
const HERO_BLUE = "#2563EB";
const NAVY = "#121B2E";
const MUTED = "#434655";
const CHIP_BG = "#E9EDFF";
const TRACK = "#D9E2FC";
const ACCENT_PROGRESS = "#784B00";
const ACCENT_RESOLVED = "#006E2D";
const AI_BG = "rgba(37, 99, 235, 0.05)";
const AI_BORDER = "rgba(37, 99, 235, 0.2)";
const IMPACT_ICON_BG = "rgba(0, 110, 45, 0.1)";

const PLACEHOLDER_THUMBS = [
  require("../../assets/images/report-thumb-1.png"),
  require("../../assets/images/report-thumb-2.png"),
];

const PIPELINE: { label: string; icon: IconName }[] = [
  { label: "Photo", icon: "camera" },
  { label: "AI", icon: "sparkle" },
  { label: "Action", icon: "confirm_check" },
];

type PulseChip = {
  category: ReportCategory;
  icon: IconName;
  count: number;
};

const CATEGORY_ICONS: Partial<Record<ReportCategory, IconName>> = {
  WATER_SUPPLY: "water",
  DRAINAGE: "drainage",
  ROADS: "roads",
  SANITATION: "garbage",
  ELECTRICITY: "electricity",
  STREETLIGHT: "streetlight",
  PUBLIC_SAFETY: "citizens",
  PARKS_AND_TREES: "sparkle",
  STRAY_ANIMALS: "citizens",
  OTHER: "filter",
};

function iconForCategory(category: ReportCategory): IconName {
  return CATEGORY_ICONS[category] ?? "filter";
}

function issueWord(count: number): string {
  return count === 1 ? "issue" : "issues";
}

function accentForStatus(status: ReportStatus | string): string {
  if (status === "RESOLVED") return ACCENT_RESOLVED;
  if (
    status === "IN_PROGRESS" ||
    status === "ASSIGNED" ||
    status === "ACKNOWLEDGED"
  ) {
    return ACCENT_PROGRESS;
  }
  return HERO_BLUE;
}

function compactStatus(status: ReportStatus | string): {
  label: string;
  bg: string;
  color: string;
} {
  if (status === "RESOLVED") {
    return {
      label: "Resolved",
      bg: "rgba(0, 110, 45, 0.1)",
      color: ACCENT_RESOLVED,
    };
  }
  if (
    status === "IN_PROGRESS" ||
    status === "ASSIGNED" ||
    status === "ACKNOWLEDGED"
  ) {
    return {
      label: "In Progress",
      bg: "rgba(120, 75, 0, 0.1)",
      color: ACCENT_PROGRESS,
    };
  }
  return {
    label: "Submitted",
    bg: "rgba(37, 99, 235, 0.1)",
    color: HERO_BLUE,
  };
}

function thisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

/**
 * Home — Figma node 146:63
 * https://www.figma.com/design/NpUzZL5nhEFXRfBckY2xfe/mp--Copy-?node-id=146-63
 */
export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { token, user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        if (!token) {
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const list = await listIssues(token);
          if (!cancelled) setReports(list);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to load reports");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [token]),
  );

  const stats = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((r) => r.status === "RESOLVED").length;
    const reportedMonth = reports.filter((r) => thisMonth(r.createdAt)).length;
    const resolvedMonth = reports.filter(
      (r) => r.status === "RESOLVED" && thisMonth(r.updatedAt ?? r.createdAt),
    ).length;
    const progress = total === 0 ? 0 : Math.min(1, resolved / total);

    // Tally every categorized report from the API — no hardcoded buckets.
    const byCategory = new Map<ReportCategory, number>();
    for (const report of reports) {
      if (!report.category) continue;
      byCategory.set(
        report.category,
        (byCategory.get(report.category) ?? 0) + 1,
      );
    }

    const pulse: PulseChip[] = [...byCategory.entries()]
      .map(([category, count]) => ({
        category,
        count,
        icon: iconForCategory(category),
      }))
      .sort((a, b) => b.count - a.count);

    const top = pulse[0];
    const insight = top
      ? `${formatCategoryLabel(top.category)} accounts for ${top.count} of your ${total} ${issueWord(total)}.`
      : total > 0
        ? "Reports are still being classified. Check back shortly for category insights."
        : "File a report to see category insights here.";

    return {
      total,
      resolved,
      reportedMonth,
      resolvedMonth,
      progress,
      pulse,
      insight,
      recent: reports.slice(0, 2),
    };
  }, [reports]);

  function goCapture(category?: ReportCategory) {
    navigation.navigate("Capture", category ? { category } : undefined);
  }

  function onNav(tab: NavTab) {
    handleTabNavigate(navigation, tab, "home");
  }

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "Citizen";

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="home"
        onNotifications={() => navigation.navigate("Notifications")}
        onProfile={() => navigation.navigate("Profile")}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          {greetingForNow()}, {firstName} 👋
        </Text>

        <View style={styles.locationRow}>
          <Icon name="pin" width={12} height={15} color={HERO_BLUE} />
          <Text style={styles.locationText}>Sector 62, Noida</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.aiBadge}>
            <Icon name="sparkle" width={13} height={13} color={colors.white} />
            <Text style={styles.aiBadgeText}>AI-Powered</Text>
          </View>

          <Text style={styles.heroTitle}>See something that needs fixing?</Text>
          <Text style={styles.heroSub}>
            Take a photo and let NIVARAN{"\n"}handle the details.
          </Text>

          <View style={styles.pipeline}>
            {PIPELINE.map((step, i) => (
              <View key={step.label} style={styles.pipelineItem}>
                {i > 0 ? (
                  <Icon
                    name="chevron"
                    width={8}
                    height={10}
                    color="rgba(255,255,255,0.7)"
                  />
                ) : null}
                <View style={styles.pipelineStep}>
                  <Icon
                    name={step.icon}
                    width={18}
                    height={18}
                    color={colors.white}
                  />
                  <Text style={styles.pipelineLabel}>{step.label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.heroBtn}
            onPress={() => goCapture()}
            accessibilityLabel="Report an Issue"
          >
            <Icon name="camera" width={20} height={18} color={HERO_BLUE} />
            <Text style={styles.heroBtnText}>Report an Issue</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your City, Your Signal</Text>
          <View style={styles.statsRow}>
            <View style={styles.statLeft}>
              <Text style={styles.statBigBlue}>
                {stats.resolved.toLocaleString()}
              </Text>
              <Text style={styles.statUnit}> resolved</Text>
            </View>
            <View style={styles.statRight}>
              <Text style={styles.statBigNavy}>
                {stats.reportedMonth.toLocaleString()}
              </Text>
              <Text style={styles.statMuted}>reported this month</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.trackFill,
                { width: `${Math.round(stats.progress * 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Civic Pulse</Text>
          <Text style={styles.cardSub}>What&apos;s happening near you?</Text>

          {stats.pulse.length === 0 ? (
            <Text style={styles.empty}>
              {stats.total === 0
                ? "No issues yet — categories will appear after you report."
                : "Waiting on AI classification for category breakdown."}
            </Text>
          ) : (
            <View style={styles.chips}>
              {stats.pulse.map((chip) => (
                <Pressable
                  key={chip.category}
                  style={styles.chip}
                  onPress={() => goCapture(chip.category)}
                >
                  <Icon
                    name={chip.icon}
                    width={12}
                    height={14}
                    color={NAVY}
                  />
                  <Text style={styles.chipText}>
                    {chip.count} {formatCategoryLabel(chip.category)}{" "}
                    {issueWord(chip.count)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.exploreRow}
            onPress={() => navigation.navigate("Nearby")}
          >
            <Text style={styles.exploreText}>Explore nearby issues</Text>
            <Icon name="chevron" width={8} height={12} color={HERO_BLUE} />
          </Pressable>
        </View>

        <View style={styles.impactCard}>
          <View style={styles.impactIcon}>
            <Icon
              name="confirm_check"
              width={18}
              height={14}
              color={ACCENT_RESOLVED}
            />
          </View>
          <Text style={styles.impactText}>
            <Text style={styles.impactStrong}>
              {stats.resolvedMonth} {issueWord(stats.resolvedMonth)}
            </Text>
            {" have been resolved\nnear you this month."}
          </Text>
        </View>

        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Icon name="sparkle" width={16} height={16} color={HERO_BLUE} />
            <Text style={styles.aiTitle}>NIVARAN AI Insight</Text>
          </View>
          <Text style={styles.aiBody}>{stats.insight}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <Pressable onPress={() => navigation.navigate("MyReports")}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.brandBlueDeep}
            style={{ marginTop: 8 }}
          />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : stats.recent.length === 0 ? (
          <Text style={styles.empty}>
            No reports yet. Tap Report an Issue to file your first one.
          </Text>
        ) : (
          <View style={styles.reportList}>
            {stats.recent.map((report, index) => (
              <RecentCard
                key={report.id}
                report={report}
                thumbFallback={
                  PLACEHOLDER_THUMBS[index % PLACEHOLDER_THUMBS.length]
                }
                onPress={() =>
                  navigation.navigate("TrackIssue", { issueId: report.id })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav active="home" onNavigate={onNav} />
    </View>
  );
}

function RecentCard({
  report,
  thumbFallback,
  onPress,
}: {
  report: Report;
  thumbFallback: number;
  onPress: () => void;
}) {
  const title = report.category
    ? formatCategoryLabel(report.category)
    : report.description.slice(0, 40) || "Issue";
  const photo = report.photoUrls[0];
  const status = compactStatus(report.status);
  const accent = accentForStatus(report.status);
  const useIconThumb = !photo && report.category === "DRAINAGE";

  return (
    <Pressable style={styles.reportCard} onPress={onPress}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      {useIconThumb ? (
        <View style={styles.iconThumb}>
          <Icon name="drainage" width={22} height={17} color={HERO_BLUE} />
        </View>
      ) : (
        <Image
          source={photo ? { uri: photo } : thumbFallback}
          style={styles.thumb}
          resizeMode="cover"
        />
      )}
      <View style={styles.reportBody}>
        <Text style={styles.reportTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.reportMetaRow}>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusPillText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <Text style={styles.reportTime}>
            · {formatRelativeTime(report.createdAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 16,
  },
  greeting: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 24,
    lineHeight: 31,
    color: NAVY,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -8,
  },
  locationText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: HERO_BLUE,
  },
  hero: {
    backgroundColor: HERO_BLUE,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  aiBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  aiBadgeText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.white,
  },
  heroTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.white,
    textAlign: "center",
  },
  heroSub: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 8,
  },
  pipeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pipelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pipelineStep: {
    alignItems: "center",
    gap: 4,
  },
  pipelineLabel: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 10,
    lineHeight: 15,
    color: colors.white,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 9999,
    height: 48,
    paddingHorizontal: 24,
    minWidth: 180,
  },
  heroBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: HERO_BLUE,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: NAVY,
  },
  cardSub: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: MUTED,
    marginTop: -4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  statLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  statBigBlue: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 24,
    lineHeight: 31,
    color: HERO_BLUE,
  },
  statUnit: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: MUTED,
    marginBottom: 2,
  },
  statRight: {
    alignItems: "flex-end",
  },
  statBigNavy: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: NAVY,
  },
  statMuted: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: MUTED,
  },
  track: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: TRACK,
    overflow: "hidden",
    marginTop: 4,
  },
  trackFill: {
    height: 8,
    borderRadius: 9999,
    backgroundColor: HERO_BLUE,
  },
  chips: {
    gap: 8,
  },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CHIP_BG,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(195, 198, 215, 0.3)",
    paddingHorizontal: 13,
    paddingVertical: 9,
    minHeight: 34,
  },
  chipText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: NAVY,
  },
  exploreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  exploreText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: HERO_BLUE,
  },
  impactCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 80,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: IMPACT_ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  impactText: {
    flex: 1,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: NAVY,
  },
  impactStrong: {
    fontFamily: fonts.Inter_600SemiBold,
  },
  aiCard: {
    backgroundColor: AI_BG,
    borderWidth: 1,
    borderColor: AI_BORDER,
    borderRadius: 16,
    padding: 17,
    gap: 8,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  aiTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: HERO_BLUE,
  },
  aiBody: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: NAVY,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: NAVY,
  },
  viewAll: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.14,
    color: HERO_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  empty: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  reportList: {
    gap: 12,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: TRACK,
    marginLeft: 4,
  },
  iconThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#D9E2FC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  reportBody: {
    flex: 1,
    gap: 6,
  },
  reportTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.14,
    color: NAVY,
  },
  reportMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusPillText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 10,
    lineHeight: 15,
  },
  reportTime: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
  },
});
