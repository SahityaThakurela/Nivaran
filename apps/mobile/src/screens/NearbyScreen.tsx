import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
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
import type { Report, ReportCategory } from "../api/types";
import { listIssues } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import { StatusBadge } from "../components/StatusBadge";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import {
  distanceMeters,
  formatCategoryLabel,
  formatDistance,
  formatRelativeTime,
} from "../utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList, "Nearby">;

type LocatedReport = Report & { distance: number };

const CATEGORY_ICON: Partial<Record<ReportCategory, IconName>> = {
  WATER_SUPPLY: "water",
  SANITATION: "garbage",
  ROADS: "roads",
  ELECTRICITY: "electricity",
  DRAINAGE: "drainage",
  STREETLIGHT: "streetlight",
  OTHER: "other",
};

export function NearbyScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const [reports, setReports] = useState<LocatedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null,
  );

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
          let lat = 28.6139;
          let lng = 77.209;
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
          setSelectedId((prev) => prev ?? located[0]?.id ?? null);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to load nearby");
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

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const pinLayout = useMemo(() => {
    if (reports.length === 0) return [];
    const lats = reports.map((r) => r.latitude);
    const lngs = reports.map((r) => r.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(maxLat - minLat, 0.0008);
    const lngSpan = Math.max(maxLng - minLng, 0.0008);

    return reports.map((r) => {
      const x = ((r.longitude - minLng) / lngSpan) * 80 + 10;
      const y = (1 - (r.latitude - minLat) / latSpan) * 70 + 12;
      return { id: r.id, x, y, category: r.category };
    });
  }, [reports]);

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
      >
        <Text style={styles.title}>Nearby Issues</Text>
        <Text style={styles.subtitle}>
          {userLoc
            ? "Sorted by distance from your location"
            : "Enable location for accurate distances"}
        </Text>

        <View style={styles.mapArea}>
          {pinLayout.map((pin) => {
            const iconName: IconName =
              (pin.category && CATEGORY_ICON[pin.category]) || "pin";
            const active = pin.id === selectedId;
            return (
              <Pressable
                key={pin.id}
                style={[
                  styles.pin,
                  {
                    left: `${pin.x}%`,
                    top: `${pin.y}%`,
                  },
                  active && styles.pinActive,
                ]}
                onPress={() => setSelectedId(pin.id)}
              >
                <Icon
                  name={iconName}
                  width={16}
                  height={16}
                  color={active ? colors.white : colors.brandBlueDeep}
                />
              </Pressable>
            );
          })}
          {reports.length === 0 && !loading ? (
            <Text style={styles.mapEmpty}>No reports to map yet</Text>
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
                  <Image
                    source={
                      selected.photoUrls[0]
                        ? { uri: selected.photoUrls[0] }
                        : require("../../assets/images/nearby-thumb.png")
                    }
                    style={styles.sheetThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.sheetBody}>
                    <Text style={styles.sheetTitle} numberOfLines={1}>
                      {selected.category
                        ? formatCategoryLabel(selected.category)
                        : "Issue"}
                    </Text>
                    <Text style={styles.sheetMeta} numberOfLines={1}>
                      {formatDistance(selected.distance)} ·{" "}
                      {formatRelativeTime(selected.updatedAt)}
                    </Text>
                    <StatusBadge status={selected.status} />
                  </View>
                </View>
                <Text style={styles.sheetAddress} numberOfLines={2}>
                  {selected.address ?? "Location pending"}
                </Text>
                <Pressable
                  style={styles.detailsBtn}
                  onPress={() =>
                    navigation.navigate("TrackIssue", {
                      issueId: selected.id,
                    })
                  }
                >
                  <Text style={styles.detailsBtnText}>View Details</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.listTitle}>Closest first</Text>
            <View style={styles.list}>
              {reports.map((report) => (
                <Pressable
                  key={report.id}
                  style={[
                    styles.listCard,
                    report.id === selectedId && styles.listCardActive,
                  ]}
                  onPress={() => setSelectedId(report.id)}
                >
                  <Text style={styles.listTitleText} numberOfLines={1}>
                    {report.category
                      ? formatCategoryLabel(report.category)
                      : "Issue"}
                  </Text>
                  <Text style={styles.listMeta}>
                    {formatDistance(report.distance)}
                  </Text>
                </Pressable>
              ))}
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
    height: 220,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.softBlue,
    overflow: "hidden",
    position: "relative",
  },
  mapEmpty: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    color: colors.bodyMuted,
  },
  pin: {
    position: "absolute",
    width: 36,
    height: 36,
    marginLeft: -18,
    marginTop: -18,
    borderRadius: 18,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  pinActive: {
    backgroundColor: colors.brandBlueDeep,
    zIndex: 2,
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
  listTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    color: colors.brandNavy,
    marginTop: 4,
  },
  list: {
    gap: 8,
  },
  listCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  listCardActive: {
    borderWidth: 1,
    borderColor: colors.brandBlueDeep,
  },
  listTitleText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    color: colors.brandNavy,
    flex: 1,
  },
  listMeta: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
