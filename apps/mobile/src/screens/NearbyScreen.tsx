import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { OsmNearbyMap } from "../components/OsmNearbyMap";
import { ReportPhoto } from "../components/ReportPhoto";
import { StatusBadge } from "../components/StatusBadge";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import {
  distanceMeters,
  formatDistance,
  formatRelativeTime,
} from "../utils/format";
import { pickRemotePhotoUrl } from "../utils/photoUrl";

type Nav = NativeStackNavigationProp<RootStackParamList, "Nearby">;

type LocatedReport = Report & { distance: number };

const FALLBACK_THUMB = require("../../assets/images/nearby-thumb.png");

function reportTitle(
  report: Report,
  categoryLabel: (category: string) => string,
  issueFallback: string,
): string {
  const stripped = report.description.replace(/^\[[A-Z_]+\]\s*/, "").trim();
  if (stripped.length > 0) {
    return stripped.length > 42 ? `${stripped.slice(0, 42)}…` : stripped;
  }
  if (report.aiSummary) {
    return report.aiSummary.length > 42
      ? `${report.aiSummary.slice(0, 42)}…`
      : report.aiSummary;
  }
  return report.category ? categoryLabel(report.category) : issueFallback;
}

function statusMeta(
  status: ReportStatus,
  t: (key: TranslationKey) => string,
): { label: string; dot: string; text: string } {
  switch (status) {
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "ACKNOWLEDGED":
      return {
        label: t("status.inProgress"),
        dot: colors.statusProgressDot,
        text: colors.statusProgressText,
      };
    case "RESOLVED":
      return {
        label: t("status.resolved"),
        dot: colors.statusResolvedDot,
        text: colors.statusResolvedText,
      };
    case "SUBMITTED":
      return {
        label: t("status.pending"),
        dot: colors.brandBlueDeep,
        text: colors.brandBlueDeep,
      };
    default:
      return {
        label: status.replace(/_/g, " "),
        dot: colors.bodyMuted,
        text: colors.bodyMuted,
      };
  }
}

export function NearbyScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const { t, categoryLabel } = useLanguage();
  const [reports, setReports] = useState<LocatedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [mapInteracting, setMapInteracting] = useState(false);

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
          let lat = 28.5355;
          let lng = 77.391;
          try {
            const { status } =
              await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
            }
          } catch {
            // keep fallback coords
          }
          if (cancelled) return;
          setUserLoc({ lat, lng });

          const list = await listIssues(token);
          if (cancelled) return;

          const located: LocatedReport[] = list
            .map((r) => ({
              ...r,
              distance: distanceMeters(lat, lng, r.latitude, r.longitude),
            }))
            .sort((a, b) => a.distance - b.distance);

          setReports(located);
          setSelectedId((prev) => {
            if (prev && located.some((r) => r.id === prev)) return prev;
            return located[0]?.id ?? null;
          });
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : t("nearby.failedLoad"));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [token, t]),
  );

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const mapMarkers = useMemo(
    () =>
      reports.map((r) => ({
        id: r.id,
        latitude: r.latitude,
        longitude: r.longitude,
        category: r.category,
        photoUrl: pickRemotePhotoUrl(r.photoUrls),
      })),
    [reports],
  );

  function openIssue(issueId: string) {
    setSelectedId(issueId);
    navigation.navigate("TrackIssue", { issueId });
  }

  function onNav(tab: NavTab) {
    handleTabNavigate(navigation, tab, "nearby");
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
        scrollEnabled={!mapInteracting}
        nestedScrollEnabled
      >
        <Text style={styles.title}>{t("nearby.title")}</Text>
        <Text style={styles.subtitle}>
          {userLoc ? t("nearby.sorted") : t("nearby.enableLocation")}
        </Text>

        <View style={styles.mapArea}>
          <OsmNearbyMap
            markers={mapMarkers}
            selectedId={selectedId}
            userLocation={userLoc}
            onSelect={setSelectedId}
            onOpenIssue={openIssue}
            onTouchMap={setMapInteracting}
          />
          {reports.length === 0 && !loading ? (
            <View style={styles.mapEmptyOverlay} pointerEvents="none">
              <Text style={styles.mapEmpty}>{t("nearby.mapEmpty")}</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.brandBlueDeep}
            style={{ marginTop: 16 }}
          />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : (
          <>
            {selected ? (
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetRow}>
                  <ReportPhoto
                    urls={selected.photoUrls}
                    fallback={FALLBACK_THUMB}
                    style={styles.sheetThumb}
                  />
                  <View style={styles.sheetBody}>
                    <Text style={styles.sheetTitle} numberOfLines={1}>
                      {reportTitle(
                        selected,
                        categoryLabel,
                        t("nearby.issue"),
                      )}
                    </Text>
                    <Text style={styles.sheetMeta} numberOfLines={1}>
                      {formatDistance(selected.distance, t)} ·{" "}
                      {formatRelativeTime(selected.updatedAt, t)}
                    </Text>
                    <StatusBadge status={selected.status} />
                  </View>
                </View>
                <Text style={styles.sheetAddress} numberOfLines={2}>
                  {selected.address ?? t("common.locationPending")}
                </Text>
                <Pressable
                  style={styles.detailsBtn}
                  onPress={() =>
                    navigation.navigate("TrackIssue", {
                      issueId: selected.id,
                    })
                  }
                >
                  <Text style={styles.detailsBtnText}>
                    {t("nearby.viewDetails")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.listHeading}>{t("nearby.closest")}</Text>
            <View style={styles.list}>
              {reports.map((report) => {
                const status = statusMeta(report.status, t);
                const place =
                  report.address?.split(",")[0]?.trim() ||
                  t("nearby.location");

                return (
                  <Pressable
                    key={report.id}
                    style={[
                      styles.listRow,
                      report.id === selectedId && styles.listRowActive,
                    ]}
                    onPress={() => openIssue(report.id)}
                  >
                    <ReportPhoto
                      urls={report.photoUrls}
                      fallback={FALLBACK_THUMB}
                      style={styles.listThumb}
                    />

                    <View style={styles.listBody}>
                      <View style={styles.listTopRow}>
                        <Text style={styles.listTitleText} numberOfLines={1}>
                          {reportTitle(
                            report,
                            categoryLabel,
                            t("nearby.issue"),
                          )}
                        </Text>
                        <View style={styles.statusInline}>
                          <View
                            style={[styles.statusDot, { backgroundColor: status.dot }]}
                          />
                          <Text style={[styles.statusLabel, { color: status.text }]}>
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.listMetaRow}>
                        <Icon
                          name="pin"
                          width={11}
                          height={13}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.listMetaText} numberOfLines={1}>
                          {formatDistance(report.distance, t)} · {place}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <BottomNav active="nearby" onNavigate={onNav} />
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
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  subtitle: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
    marginTop: -4,
  },
  mapArea: {
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#e8eef5",
    position: "relative",
  },
  mapEmptyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  mapEmpty: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    color: colors.bodyMuted,
    backgroundColor: "rgba(249,249,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  empty: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.bodyMuted,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#121B2E",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dragHandle,
    marginBottom: 4,
  },
  sheetRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  sheetThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.softBlue,
  },
  sheetBody: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.brandNavy,
  },
  sheetMeta: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  sheetAddress: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.bodyMuted,
  },
  detailsBtn: {
    backgroundColor: colors.brandBlueDeep,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  detailsBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    color: colors.white,
  },
  listHeading: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    color: colors.brandNavy,
    marginTop: 4,
  },
  list: {
    gap: 4,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  listRowActive: {
    backgroundColor: colors.unreadTint,
    borderRadius: 12,
    borderBottomWidth: 0,
    paddingHorizontal: 8,
  },
  listThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
  },
  listBody: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  listTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listTitleText: {
    flex: 1,
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  statusInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 12,
    lineHeight: 16,
  },
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  listMetaText: {
    flex: 1,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
