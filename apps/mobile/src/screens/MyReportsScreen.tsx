import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import type { Report, ReportStatus } from "../api/types";
import { listIssues } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import { StatusBadge } from "../components/StatusBadge";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import {
  formatCategoryLabel,
  formatRelativeTime,
  reportProgressStep,
} from "../utils/format";
import { verifiedStorageKey } from "../utils/notifications";

type Nav = NativeStackNavigationProp<RootStackParamList, "MyReports">;

type FilterTab = "all" | "active" | "resolved";

const CLOSED: ReportStatus[] = ["RESOLVED", "REJECTED", "DUPLICATE"];

const PLACEHOLDER_THUMBS = [
  require("../../assets/images/report-thumb-1.png"),
  require("../../assets/images/report-thumb-2.png"),
];

function isActive(status: ReportStatus): boolean {
  return !CLOSED.includes(status);
}

export function MyReportsScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

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
          if (cancelled) return;
          setReports(list);

          const keys = list
            .filter((r) => r.status === "RESOLVED")
            .map((r) => verifiedStorageKey(r.id));
          if (keys.length > 0) {
            const pairs = await AsyncStorage.multiGet(keys);
            if (cancelled) return;
            const next = new Set<string>();
            for (const [key, value] of pairs) {
              if (value) {
                const id = key.replace("@nivaran/verified/", "");
                next.add(id);
              }
            }
            setVerifiedIds(next);
          } else {
            setVerifiedIds(new Set());
          }
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
    const active = reports.filter((r) => isActive(r.status)).length;
    const resolved = reports.filter((r) => r.status === "RESOLVED").length;
    return { total, active, resolved };
  }, [reports]);

  const filtered = useMemo(() => {
    if (filter === "active") return reports.filter((r) => isActive(r.status));
    if (filter === "resolved")
      return reports.filter((r) => r.status === "RESOLVED");
    return reports;
  }, [reports, filter]);

  function onNav(tab: NavTab) {
    handleTabNavigate(navigation, tab, "reports");
  }

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
        <View style={styles.titleRow}>
          <Text style={styles.title}>My Reports</Text>
          <Pressable
            style={styles.newBtn}
            onPress={() => navigation.navigate("Capture")}
          >
            <Icon name="nav_plus" width={14} height={14} color={colors.white} />
            <Text style={styles.newBtnText}>New Report</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} accent={colors.mustard} />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            accent={colors.brandBlueDeep}
          />
        </View>

        <View style={styles.segment}>
          {(
            [
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "resolved", label: "Resolved" },
            ] as const
          ).map((tab) => {
            const selected = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.segmentBtn, selected && styles.segmentSelected]}
                onPress={() => setFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    selected && styles.segmentLabelSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.brandBlueDeep}
            style={{ marginTop: 24 }}
          />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No reports in this filter.</Text>
        ) : (
          <View style={styles.list}>
            {filtered.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                thumbFallback={
                  PLACEHOLDER_THUMBS[index % PLACEHOLDER_THUMBS.length]
                }
                needsVerify={
                  report.status === "RESOLVED" &&
                  !verifiedIds.has(report.id) &&
                  report.feedbackRating == null
                }
                onPress={() =>
                  navigation.navigate("TrackIssue", { issueId: report.id })
                }
                onVerify={() =>
                  navigation.navigate("VerifyResolution", {
                    issueId: report.id,
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav active="reports" onNavigate={onNav} />
    </View>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReportCard({
  report,
  thumbFallback,
  needsVerify,
  onPress,
  onVerify,
}: {
  report: Report;
  thumbFallback: number;
  needsVerify: boolean;
  onPress: () => void;
  onVerify: () => void;
}) {
  const title = report.category
    ? formatCategoryLabel(report.category)
    : report.description.slice(0, 40) || "Issue";
  const photo = report.photoUrls[0];
  const progress = reportProgressStep(report.status);
  const resolved = report.status === "RESOLVED";
  const inProgress =
    report.status === "IN_PROGRESS" || report.status === "ASSIGNED";

  return (
    <Pressable
      style={[
        styles.card,
        resolved && styles.cardResolved,
        inProgress && styles.cardProgress,
      ]}
      onPress={onPress}
    >
      <Image
        source={photo ? { uri: photo } : thumbFallback}
        style={styles.thumb}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, (resolved || inProgress) && styles.cardTitleLight]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={[styles.cardMeta, (resolved || inProgress) && styles.cardMetaLight]}
          numberOfLines={1}
        >
          {report.address ?? "Location pending"} ·{" "}
          {formatRelativeTime(report.updatedAt)}
        </Text>
        {resolved || inProgress ? (
          <Text style={styles.progressText}>
            Step {progress.step}/{progress.total}
          </Text>
        ) : (
          <StatusBadge status={report.status} />
        )}
        {needsVerify ? (
          <Pressable style={styles.verifyChip} onPress={onVerify}>
            <Text style={styles.verifyChipText}>Verify resolution</Text>
          </Pressable>
        ) : null}
      </View>
      <Icon
        name="chevron"
        width={6}
        height={9}
        color={resolved || inProgress ? colors.white : colors.textSecondary}
      />
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
    paddingBottom: 24,
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandBlueDeep,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 13,
    color: colors.white,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statValue: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  statLabel: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.bodyMuted,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.softBlue,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentSelected: {
    backgroundColor: colors.white,
  },
  segmentLabel: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    color: colors.bodyMuted,
  },
  segmentLabelSelected: {
    color: colors.brandBlueDeep,
  },
  empty: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
    marginTop: 8,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
  },
  cardResolved: {
    backgroundColor: colors.brandBlueDeep,
  },
  cardProgress: {
    backgroundColor: colors.mustard,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.softBlue,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  cardTitleLight: {
    color: colors.white,
  },
  cardMeta: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  cardMetaLight: {
    color: "rgba(255,255,255,0.85)",
  },
  progressText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.9)",
  },
  verifyChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: colors.resolvedBanner,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifyChipText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 12,
    color: colors.resolvedDark,
  },
});
