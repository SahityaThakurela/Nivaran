import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { Icon } from "../components/Icon";
import { OsmMapPicker, type OsmMapPickerHandle } from "../components/OsmMapPicker";
import { useLanguage } from "../i18n/LanguageContext";
import {
  fetchDeviceLocation,
  hasValidCoords,
} from "../location/deviceLocation";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "AdjustMap">;
type Route = RouteProp<RootStackParamList, "AdjustMap">;

async function labelForCoords(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const p = places[0];
    if (!p) {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
    return (
      [p.name, p.street, p.city, p.region].filter(Boolean).join(", ") ||
      `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    );
  } catch {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
}

/**
 * Full-screen map to drop / drag a pin for the report location.
 * Confirm merges lat/lng/address back into ReportDetails.
 */
export function AdjustMapScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { latitude: initialLat, longitude: initialLng, photoUri, domain } =
    route.params;

  const hasInitial = hasValidCoords(initialLat, initialLng);
  const [pin, setPin] = useState({
    latitude: hasInitial ? initialLat : 28.5355,
    longitude: hasInitial ? initialLng : 77.391,
  });
  const [address, setAddress] = useState(() =>
    hasInitial ? t("map.movePin") : t("capture.locating"),
  );
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<OsmMapPickerHandle>(null);
  const didAutoLocate = useRef(false);

  const scheduleGeocode = useCallback((latitude: number, longitude: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    setGeocoding(true);
    geocodeTimer.current = setTimeout(() => {
      void labelForCoords(latitude, longitude).then((label) => {
        setAddress(label);
        setGeocoding(false);
      });
    }, 350);
  }, []);

  const movePin = useCallback(
    (latitude: number, longitude: number) => {
      setPin({ latitude, longitude });
      scheduleGeocode(latitude, longitude);
    },
    [scheduleGeocode],
  );

  const onUseMyLocation = useCallback(async () => {
    setBusy(true);
    try {
      const loc = await fetchDeviceLocation({
        accuracy: Location.Accuracy.High,
        withAddress: true,
      });
      movePin(loc.latitude, loc.longitude);
      mapRef.current?.moveTo(loc.latitude, loc.longitude);
      if (loc.address) setAddress(loc.address);
    } catch {
      // Keep current pin; user can still drag manually.
    } finally {
      setBusy(false);
    }
  }, [movePin]);

  useEffect(() => {
    if (hasInitial) {
      scheduleGeocode(initialLat, initialLng);
      return;
    }
    if (didAutoLocate.current) return;
    didAutoLocate.current = true;
    void onUseMyLocation();
  }, [hasInitial, initialLat, initialLng, onUseMyLocation, scheduleGeocode]);

  async function onConfirm() {
    setBusy(true);
    try {
      const label =
        address === t("map.movePin") || address === t("capture.locating")
          ? await labelForCoords(pin.latitude, pin.longitude)
          : address;
      navigation.navigate({
        name: "ReportDetails",
        params: {
          photoUri,
          latitude: pin.latitude,
          longitude: pin.longitude,
          address: label,
          domain,
        },
        merge: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title={t("map.title")}
        onBack={() => navigation.goBack()}
        showActions={false}
      />

      <View style={styles.mapWrap}>
        <OsmMapPicker
          ref={mapRef}
          latitude={pin.latitude}
          longitude={pin.longitude}
          onMove={movePin}
        />

        <View style={styles.hint}>
          <Icon name="pin" width={12} height={15} color={colors.brandBlueDeep} />
          <Text style={styles.hintText}>{t("map.hint")}</Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.sheetLabel}>{t("map.selected")}</Text>
        <View style={styles.addressRow}>
          {geocoding || busy ? (
            <ActivityIndicator color={colors.brandBlueDeep} size="small" />
          ) : (
            <Icon name="pin" width={12} height={15} color={colors.brandBlueDeep} />
          )}
          <Text style={styles.address} numberOfLines={2}>
            {address}
          </Text>
        </View>
        <Text style={styles.coords}>
          {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
        </Text>

        <View style={styles.actions}>
          <AppButton
            label={t("map.useMyLocation")}
            variant="secondary"
            onPress={() => void onUseMyLocation()}
            disabled={busy}
          />
          <AppButton
            label={t("map.confirm")}
            onPress={() => void onConfirm()}
            disabled={busy}
            iconRight="confirm_check"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapWrap: {
    flex: 1,
    overflow: "hidden",
  },
  hint: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(249, 249, 255, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.bodyMuted,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderMuted,
  },
  sheetLabel: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  address: {
    flex: 1,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
  },
  coords: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: 8,
    gap: 10,
  },
});
