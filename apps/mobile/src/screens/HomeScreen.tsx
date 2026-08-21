import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report, ReportCategory } from "../api/types";
import { listIssues } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import { StatusBadge } from "../components/StatusBadge";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import {
  formatCategoryLabel,
  formatRelativeTime,
  greetingForNow,
} from "../utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

const CATEGORIES: {
  label: string;
  category: ReportCategory;
  icon: IconName;
}[] = [
  { label: "Water", category: "WATER_SUPPLY", icon: "water" },
  { label: "Roads", category: "ROADS", icon: "roads" },
  { label: "Sanitation", category: "SANITATION", icon: "sanitation" },
  { label: "Electricity", category: "ELECTRICITY", icon: "electricity" },
];

const PLACEHOLDER_THUMBS = [
  require("../../assets/images/report-thumb-1.png"),
  require("../../assets/images/report-thumb-2.png"),
];

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

  function goCapture(category?: string) {
    navigation.navigate("Capture", category ? { category } : undefined);
  }

  function onNav(tab: NavTab) {
    if (tab === "home") return;
    if (tab === "report") {
      goCapture();
      return;
    }
    // Other tabs not yet separate screens — stay on Home for hackathon.
  }

  return (
    <View style={styles.screen}>
      <AppHeader variant="home" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          {greetingForNow()}, {user?.name ?? "Citizen"}
        </Text>

        <View style={styles.locationRow}>
          <Icon name="pin" width={12} height={15} color={colors.bodyMuted} />
          <Text style={styles.locationText}>Sector 62, Civic Ward</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>See something broken?</Text>
          <Text style={styles.heroSub}>
            Snap a photo and report it in under a minute.
          </Text>
          <Pressable
            style={styles.heroBtn}
            onPress={() => goCapture()}
            accessibilityLabel="Report an issue"
          >
            <Icon name="camera" width={20} height={18} color={colors.heroBlue} />
            <Text style={styles.heroBtnText}>REPORT AN ISSUE</Text>
          </Pressable>
        </View>

        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.category}
              style={styles.categoryCard}
              onPress={() => goCapture(c.category)}
            >
              <Icon name={c.icon} width={20} height={20} />
              <Text style={styles.categoryLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <Pressable onPress={() => undefined}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brandBlueDeep} style={{ marginTop: 16 }} />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : reports.length === 0 ? (
          <Text style={styles.empty}>No reports yet. Be the first to report an issue.</Text>
        ) : (
          <View style={styles.reportList}>
            {reports.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                thumbFallback={PLACEHOLDER_THUMBS[index % PLACEHOLDER_THUMBS.length]}
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

function ReportCard({
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

  return (
    <Pressable style={styles.reportCard} onPress={onPress}>
      <Image
        source={photo ? { uri: photo } : thumbFallback}
        style={styles.thumb}
        resizeMode="cover"
      />
      <View style={styles.reportBody}>
        <Text style={styles.reportTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.reportMeta} numberOfLines={1}>
          {report.address ?? "Location pending"} · {formatRelativeTime(report.createdAt)}
        </Text>
        <StatusBadge status={report.status} />
      </View>
      <Icon name="chevron" width={6} height={9} color={colors.textSecondary} />
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
  greeting: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
  },
  locationText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
  },
  hero: {
    backgroundColor: colors.heroBlue,
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  heroTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.white,
  },
  heroSub: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.heroText90,
  },
  heroBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: colors.heroBlue,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.softBlue,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    minWidth: "45%",
  },
  categoryLabel: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
  },
  viewAll: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandBlueDeep,
  },
  empty: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
  },
  reportList: {
    gap: 12,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.softBlue,
  },
  reportBody: {
    flex: 1,
    gap: 4,
  },
  reportTitle: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  reportMeta: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
