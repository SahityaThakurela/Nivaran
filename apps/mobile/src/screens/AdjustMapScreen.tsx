import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { Icon } from "../components/Icon";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "AdjustMap">;
type Route = RouteProp<RootStackParamList, "AdjustMap">;

const DELTA = 0.004;

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
  const { latitude: initialLat, longitude: initialLng, photoUri, category } =
    route.params;

  const [pin, setPin] = useState({
    latitude: initialLat || 18.5204,
    longitude: initialLng || 73.8567,
  });
  const [address, setAddress] = useState("Move the pin to the exact spot");
  const [busy, setBusy] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const mapRef = useRef<MapView>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function movePin(latitude: number, longitude: number) {
    setPin({ latitude, longitude });
    scheduleGeocode(latitude, longitude);
  }

  function onMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    movePin(latitude, longitude);
  }

  async function onUseMyLocation() {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const next = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      movePin(next.latitude, next.longitude);
      mapRef.current?.animateToRegion(
        {
          ...next,
          latitudeDelta: DELTA,
          longitudeDelta: DELTA,
        },
        400,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    try {
      const label =
        address === "Move the pin to the exact spot"
          ? await labelForCoords(pin.latitude, pin.longitude)
          : address;
      navigation.navigate({
        name: "ReportDetails",
        params: {
          photoUri,
          latitude: pin.latitude,
          longitude: pin.longitude,
          address: label,
          category,
        },
        merge: true,
      });
    } finally {
      setBusy(false);
    }
  }

  const initialRegion: Region = {
    latitude: pin.latitude,
    longitude: pin.longitude,
    latitudeDelta: DELTA,
    longitudeDelta: DELTA,
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title="Adjust location"
        onBack={() => navigation.goBack()}
        showActions={false}
      />

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onPress={onMapPress}
          showsUserLocation
          showsMyLocationButton={Platform.OS === "android"}
          mapType="standard"
        >
          <Marker
            coordinate={pin}
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              movePin(latitude, longitude);
            }}
            title="Issue location"
            description="Drag to adjust"
          />
        </MapView>

        <View style={styles.hint}>
          <Icon name="pin" width={12} height={15} color={colors.brandBlueDeep} />
          <Text style={styles.hintText}>
            Tap the map or drag the pin to set the exact spot
          </Text>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.sheetLabel}>Selected location</Text>
        <View style={styles.addressRow}>
          {geocoding ? (
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
            label="Use my location"
            variant="secondary"
            onPress={() => void onUseMyLocation()}
            disabled={busy}
          />
          <AppButton
            label="Confirm location"
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
