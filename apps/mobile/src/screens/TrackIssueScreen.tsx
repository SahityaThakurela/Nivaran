import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report, ReportStatus } from "../api/types";
import { getIssue } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import {
  ActivityTimeline,
  type TimelineStep,
} from "../components/ActivityTimeline";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import { formatRelativeTime, formatTimelineStamp } from "../utils/format";
import { pickRemotePhotoUrl } from "../utils/photoUrl";
import { verifiedStorageKey } from "../utils/notifications";

type Nav = NativeStackNavigationProp<RootStackParamList, "TrackIssue">;
type Route = RouteProp<RootStackParamList, "TrackIssue">;

const CARD = "#EEEDF7";
const PAGE = "#FBF8FF";
const INK = "#1A1B22";
const MUTED = "#444653";
const STATUS_GREEN_BG = "#92F5A4";
const STATUS_GREEN_TEXT = "#007233";
const STATUS_BLUE_BG = "#004AC6";
const STATUS_BLUE_TEXT = "#A8B8FF";
const STATUS_REJECT_BG = "#FFDAD6";
const STATUS_REJECT_TEXT = "#93000A";

function stripCategoryPrefix(description: string): string {
  return description.replace(/^\[[A-Z_]+\]\s*/, "").trim();
}

function issueTitle(report: Report): string {
  const stripped = stripCategoryPrefix(report.description);
  if (!stripped) return "";
  return stripped.split(/[.!\n]/)[0]?.trim().slice(0, 80) ?? stripped.slice(0, 80);
}

function formatReportId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 4) return `NVR-${digits.slice(-5)}`;
  return `NVR-${id.slice(-5).toUpperCase()}`;
}

function statusChip(status: ReportStatus, t: (key: TranslationKey) => string) {
  if (status === "REJECTED") {
    return { bg: STATUS_REJECT_BG, text: STATUS_REJECT_TEXT, label: t("status.rejected") };
  }
  if (status === "RESOLVED") {
    return { bg: STATUS_GREEN_BG, text: STATUS_GREEN_TEXT, label: t("status.resolved") };
  }
  if (status === "IN_PROGRESS" || status === "ASSIGNED") {
    return { bg: STATUS_GREEN_BG, text: STATUS_GREEN_TEXT, label: t("status.inProgress") };
  }
  if (status === "DUPLICATE") {
    return { bg: colors.softBlueAlt, text: MUTED, label: t("status.duplicate") };
  }
  return { bg: STATUS_BLUE_BG, text: STATUS_BLUE_TEXT, label: t("status.pending") };
}

function buildTimeline(
  report: Report,
  verified: boolean,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
  domainLabel: (domain: string) => string,
): TimelineStep[] {
  const status = report.status;
  const category = report.domain ? domainLabel(report.domain) : t("common.issue");
  const created = formatTimelineStamp(report.createdAt);
  const updated = formatTimelineStamp(report.updatedAt);

  if (status === "REJECTED") {
    return [
      {
        key: "submitted",
        label: t("track.stepSubmitted"),
        at: created,
        description: t("track.descSubmitted"),
        state: "done",
      },
      {
        key: "rejected",
        label: t("track.stepRejected"),
        at: updated,
        description: report.teamNote?.trim() || t("track.descRejected"),
        state: "rejected",
      },
    ];
  }

  const assigned =
    status === "ASSIGNED" ||
    status === "IN_PROGRESS" ||
    status === "RESOLVED";
  const inProgress = status === "IN_PROGRESS" || status === "RESOLVED";
  const resolved = status === "RESOLVED";
  const hasAi = !!report.domain || !!report.aiSummary;
  const routing =
    hasAi && (status === "SUBMITTED" || status === "ACKNOWLEDGED");

  const submittedState: TimelineStep["state"] = "done";
  const aiState: TimelineStep["state"] = hasAi
    ? assigned || routing
      ? "done"
      : "current"
    : "current";
  const assignedState: TimelineStep["state"] = assigned
    ? inProgress || resolved
      ? "done"
      : "current"
    : routing
      ? "current"
      : "upcoming";
  const progressState: TimelineStep["state"] = inProgress
    ? resolved
      ? "done"
      : "current"
    : "upcoming";
  const resolvedState: TimelineStep["state"] = resolved
    ? verified
      ? "done"
      : "current"
    : "upcoming";
  const verifiedState: TimelineStep["state"] = verified ? "done" : "upcoming";

  return [
    {
      key: "submitted",
      label: t("track.stepSubmitted"),
      at: created,
      description: t("track.descSubmitted"),
      state: submittedState,
    },
    {
      key: "ai",
      label: t("track.stepAi"),
      at: hasAi ? updated ?? created : undefined,
      description: hasAi
        ? t("track.descAi", { category })
        : t("track.descAiPending"),
      state: aiState,
    },
    {
      key: "assigned",
      label: t("track.stepAssigned"),
      at: assigned ? updated : undefined,
      description: report.assignedAuthority
        ? t("track.descAssignedAuthority", { name: report.assignedAuthority.name })
        : assigned || routing
          ? t("track.descAssigned", { category })
          : t("track.waitRouting"),
      state: assignedState,
    },
    {
      key: "in_progress",
      label: t("track.inProgress"),
      at: inProgress ? updated : undefined,
      description: inProgress ? t("track.descInProgress") : t("track.waitStart"),
      state: progressState,
    },
    {
      key: "resolved",
      label: t("track.resolved"),
      at: resolved ? updated : undefined,
      description: resolved ? t("track.descResolved") : t("track.waitCompletion"),
      state: resolvedState,
    },
    {
      key: "verified",
      label: t("track.stepVerified"),
      at: verified ? updated : undefined,
      description: verified ? t("track.descVerified") : t("track.waitResolution"),
      state: verifiedState,
    },
  ];
}

function bannerCopy(
  report: Report,
  verified: boolean,
  t: (key: TranslationKey) => string,
): { title: string; body: string; rejected?: boolean } {
  if (report.status === "REJECTED") {
    return {
      title: t("track.bannerRejectedTitle"),
      body: report.teamNote?.trim() || t("track.bannerRejectedBody"),
      rejected: true,
    };
  }
  if (report.status === "RESOLVED") {
    return {
      title: verified ? t("track.bannerVerifiedTitle") : t("track.bannerResolvedTitle"),
      body: verified ? t("track.bannerVerifiedBody") : t("track.bannerResolvedBody"),
    };
  }
  if (report.status === "IN_PROGRESS" || report.status === "ASSIGNED") {
    return {
      title: t("track.bannerProgressTitle"),
      body: t("track.bannerProgressBody"),
    };
  }
  return {
    title: t("track.bannerSubmittedTitle"),
    body: t("track.bannerSubmittedBody"),
  };
}

export function TrackIssueScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token } = useAuth();
  const { t, domainLabel } = useLanguage();
  const { issueId, animateTimeline } = route.params;

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

  useEffect(() => {
    if (!token || !animateTimeline) return;
    let cancelled = false;
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      if (ticks > 16) {
        clearInterval(id);
        return;
      }
      void getIssue(token, issueId)
        .then((data) => {
          if (!cancelled) setReport(data);
        })
        .catch(() => undefined);
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, issueId, animateTimeline]);

  const timeline = useMemo(
    () => (report ? buildTimeline(report, verified, t, domainLabel) : []),
    [report, verified, t, domainLabel],
  );

  const banner = useMemo(
    () => (report ? bannerCopy(report, verified, t) : null),
    [report, verified, t],
  );

  function onNav(tab: NavTab) {
    handleTabNavigate(navigation, tab, "reports");
  }

  const remotePhoto = pickRemotePhotoUrl(report?.photoUrls);
  const chip = report ? statusChip(report.status as ReportStatus, t) : null;
  const title = report ? issueTitle(report) : "";
  const description = report ? stripCategoryPrefix(report.description) : "";

  function openMap() {
    if (!report) return;
    const url = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
    void Linking.openURL(url);
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          navigation.reset({ index: 0, routes: [{ name: "Home" }] });
        }}
        onNotifications={() => navigation.navigate("Notifications")}
        onProfile={() => navigation.navigate("Profile")}
      />

      {loading ? (
        <ActivityIndicator
          color={colors.brandBlueDeep}
          style={{ marginTop: 40 }}
        />
      ) : error || !report || !banner || !chip ? (
        <Text style={styles.error}>{error ?? t("track.notFound")}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.overview}>
            <View style={styles.thumbWrap}>
              {remotePhoto ? (
                <Image source={{ uri: remotePhoto }} style={styles.thumb} />
              ) : (
                <Image
                  source={require("../../assets/images/track-hero.png")}
                  style={styles.thumb}
                />
              )}
            </View>
            <View style={styles.overviewBody}>
              <View style={styles.chipRow}>
                <View style={styles.domainChip}>
                  <Text style={styles.domainChipText} numberOfLines={1}>
                    {(report.domain
                      ? domainLabel(report.domain)
                      : t("common.issue")
                    ).toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.statusChipText, { color: chip.text }]}>
                    {chip.label.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.issueTitle} numberOfLines={2}>
                {title || (report.domain ? domainLabel(report.domain) : t("common.issue"))}
              </Text>
              <View style={styles.metaRow}>
                <Icon name="pin" width={10} height={12} color={MUTED} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {report.address ?? t("common.locationPending")}
                </Text>
              </View>
              <Text style={styles.reportedAgo}>
                {t("track.reportedAgo", {
                  time: formatRelativeTime(report.createdAt, t),
                })}
              </Text>
            </View>
          </View>

          <View style={[styles.statusCard, banner.rejected && styles.statusCardRejected]}>
            <View style={styles.statusCopy}>
              <Text style={[styles.statusTitle, banner.rejected && styles.statusTitleRejected]}>
                {banner.title}
              </Text>
              <Text style={styles.statusBody}>{banner.body}</Text>
              <Text style={styles.lastUpdated}>
                {t("track.lastUpdated", {
                  time: formatRelativeTime(report.updatedAt, t),
                })}
              </Text>
            </View>
            <View style={[styles.statusIcon, banner.rejected && styles.statusIconRejected]}>
              <Icon
                name={banner.rejected ? "close_x" : "hardhat"}
                width={banner.rejected ? 16 : 22}
                height={banner.rejected ? 16 : 18}
                color={banner.rejected ? STATUS_REJECT_TEXT : "#00288E"}
              />
            </View>
          </View>

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

          <ActivityTimeline
            title={t("track.activityTimeline")}
            steps={timeline}
            animate={!!animateTimeline}
          />

          <View style={styles.aiCard}>
            <View style={styles.aiGlow} />
            <View style={styles.aiHeader}>
              <Icon name="sparkle" width={16} height={16} color="#F1F0FA" />
              <Text style={styles.aiTitle}>{t("track.aiSummary")}</Text>
            </View>
            <Text style={styles.aiBody}>
              {report.aiSummary?.trim() || description || t("track.aiSummaryPending")}
            </Text>
            <View style={styles.aiChips}>
              <View style={styles.aiChip}>
                <Text style={styles.aiChipText}>
                  {t("track.categoryChip", {
                    category: report.domain
                      ? domainLabel(report.domain)
                      : t("common.notSet"),
                  })}
                </Text>
              </View>
              {report.severity ? (
                <View style={[styles.aiChip, styles.aiChipWarn]}>
                  <Text style={[styles.aiChipText, styles.aiChipWarnText]}>
                    {t("track.severityChip", { severity: report.severity })}
                  </Text>
                </View>
              ) : null}
              <View style={styles.aiChip}>
                <Text style={styles.aiChipText}>
                  {t("track.priorityChip", {
                    score: Math.round(report.priorityScore),
                  })}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.teamCard}>
            <View style={styles.teamAvatar}>
              <Icon
                name={report.assignedAuthority ? "hardhat" : "profile"}
                width={18}
                height={18}
                color={colors.white}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamTitle}>
                {report.assignedAuthority
                  ? report.assignedAuthority.name
                  : report.domain
                    ? t("track.teamDept", { category: domainLabel(report.domain) })
                    : t("track.teamPending")}
              </Text>
              <Text style={styles.teamSub}>
                {report.assignedAuthority
                  ? [report.assignedAuthority.designation, report.assignedAuthority.department]
                      .filter(Boolean)
                      .join(", ") || t("track.teamField")
                  : report.facultyMentor?.trim() || t("track.teamField")}
              </Text>
              <View style={styles.teamStatusRow}>
                <View
                  style={[
                    styles.liveDot,
                    (report.status === "IN_PROGRESS" || report.status === "ASSIGNED") &&
                      styles.liveDotOn,
                  ]}
                />
                <Text style={styles.teamLive}>
                  {report.status === "IN_PROGRESS" || report.status === "ASSIGNED"
                    ? t("track.teamWorking")
                    : t("track.teamIdle")}
                </Text>
              </View>
            </View>
            {report.assignedAuthority?.phone ? (
              <Pressable
                style={styles.teamCallBtn}
                onPress={() => Linking.openURL(`tel:${report.assignedAuthority!.phone}`)}
              >
                <Icon name="phone" width={16} height={13} color={colors.white} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.mapCard}>
            <Image
              source={require("../../assets/images/map-preview.png")}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <Pressable style={styles.mapBtn} onPress={openMap}>
              <Icon name="pin" width={12} height={14} color="#00288E" />
              <Text style={styles.mapBtnText}>{t("track.viewOnMap")}</Text>
            </Pressable>
          </View>

          <Text style={styles.reportId}>
            {t("track.reportId", { id: formatReportId(report.id) })}
          </Text>

          {report.status === "RESOLVED" && !verified ? (
            <AppButton
              label={t("track.confirmResolution")}
              onPress={() =>
                navigation.navigate("VerifyResolution", { issueId: report.id })
              }
            />
          ) : null}
          {report.status === "RESOLVED" && !verified ? (
            <Text style={styles.notFixed}>{t("track.stillNotFixed")}</Text>
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
    backgroundColor: PAGE,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  error: {
    margin: 24,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.danger,
  },
  overview: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 8,
    flexDirection: "row",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#DAD9E3",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  overviewBody: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
    paddingVertical: 2,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  domainChip: {
    backgroundColor: STATUS_BLUE_BG,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "58%",
  },
  domainChipText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.25,
    color: STATUS_BLUE_TEXT,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusChipText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.25,
  },
  issueTitle: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 16,
    lineHeight: 24,
    color: INK,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    flex: 1,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  reportedAgo: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  statusCard: {
    backgroundColor: "#E8E7F1",
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  statusCardRejected: {
    backgroundColor: STATUS_REJECT_BG,
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: INK,
  },
  statusTitleRejected: {
    color: STATUS_REJECT_TEXT,
  },
  statusBody: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
  },
  lastUpdated: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 20,
    color: "#757684",
    marginTop: 8,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 40, 142, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconRejected: {
    backgroundColor: "rgba(147, 0, 10, 0.12)",
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
    backgroundColor: "#2F3037",
    borderRadius: 16,
    padding: 24,
    gap: 16,
    overflow: "hidden",
  },
  aiGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0, 40, 142, 0.2)",
    right: -16,
    top: -16,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiTitle: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 16,
    lineHeight: 24,
    color: "#F1F0FA",
  },
  aiBody: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: "#E8E7F1",
  },
  aiChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  aiChip: {
    backgroundColor: "rgba(251, 248, 255, 0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiChipWarn: {
    backgroundColor: "rgba(255, 218, 214, 0.2)",
  },
  aiChipText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 11,
    lineHeight: 16,
    color: "#F1F0FA",
  },
  aiChipWarnText: {
    color: "#FFDAD6",
  },
  teamCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  teamTitle: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 16,
    lineHeight: 24,
    color: INK,
  },
  teamSub: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },
  teamStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DAD9E3",
  },
  liveDotOn: {
    backgroundColor: "#79DB8D",
  },
  teamLive: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 11,
    lineHeight: 16,
    color: "#757684",
  },
  teamCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: "hidden",
  },
  mapImage: {
    width: "100%",
    height: 128,
  },
  mapBtn: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapBtnText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 16,
    color: "#00288E",
  },
  reportId: {
    textAlign: "center",
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: INK,
    opacity: 0.6,
    paddingVertical: 8,
  },
  notFixed: {
    textAlign: "center",
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    color: colors.brandBlueDeep,
    marginTop: -4,
  },
});
