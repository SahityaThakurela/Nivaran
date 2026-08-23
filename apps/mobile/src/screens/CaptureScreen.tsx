import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { useLanguage } from "../i18n/LanguageContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "Capture">;
type Route = RouteProp<RootStackParamList, "Capture">;

export function CaptureScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const domain = route.params?.domain;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState(() => t("capture.locating"));
  const locationRef = useRef({
    latitude: 0,
    longitude: 0,
    address: t("capture.locating"),
  });

  useEffect(() => {
    let cancelled = false;
    async function loadLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            const msg = t("capture.permissionDenied");
            setAddress(msg);
            locationRef.current.address = msg;
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        locationRef.current.latitude = pos.coords.latitude;
        locationRef.current.longitude = pos.coords.longitude;

        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (cancelled) return;
          const p = places[0];
          const label = p
            ? [p.name, p.street, p.city, p.region].filter(Boolean).join(", ") ||
              `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
            : `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          setAddress(label);
          locationRef.current.address = label;
        } catch {
          if (!cancelled) {
            const label = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
            setAddress(label);
            locationRef.current.address = label;
          }
        }
      } catch {
        if (!cancelled) {
          const msg = t("capture.unableLocation");
          setAddress(msg);
          locationRef.current.address = msg;
        }
      }
    }
    void loadLocation();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function goToDetails(photoUri: string) {
    const loc = locationRef.current;
    navigation.replace("ReportDetails", {
      photoUri,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address:
        loc.address === t("capture.locating") ? undefined : loc.address,
      domain,
    });
  }

  async function openCamera() {
    setError(null);
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError(t("capture.cameraPermission"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        goToDetails(result.assets[0].uri);
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  async function openGallery() {
    setError(null);
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t("capture.galleryPermission"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsEditing: false,
        mediaTypes: ["images"],
        selectionLimit: 1,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        goToDetails(result.assets[0].uri);
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel={t("common.goBack")}
          disabled={busy}
        >
          <Icon name="back" width={16} height={16} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>{t("capture.title")}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.center}>
        <View style={styles.heroIcon}>
          <Icon name="camera" width={28} height={24} color={colors.white} />
        </View>
        <Text style={styles.heading}>{t("capture.heading")}</Text>
        <Text style={styles.hint}>{t("capture.hint")}</Text>

        {busy ? (
          <ActivityIndicator color={colors.white} size="large" style={{ marginTop: 12 }} />
        ) : (
          <View style={styles.actions}>
            <Pressable
              onPress={() => void openCamera()}
              style={styles.primaryBtn}
              accessibilityLabel={t("capture.takePhoto")}
            >
              <Icon name="camera" width={20} height={18} color={colors.heroBlue} />
              <Text style={styles.primaryBtnText}>{t("capture.takePhoto")}</Text>
            </Pressable>

            <Pressable
              onPress={() => void openGallery()}
              style={styles.secondaryBtn}
              accessibilityLabel={t("capture.gallery")}
            >
              <Icon name="gallery" width={20} height={20} color={colors.white} />
              <Text style={styles.secondaryBtnText}>{t("capture.gallery")}</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={[styles.addressWrap, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.pill}>
          <Icon name="pin" width={12} height={15} color={colors.white} />
          <Text style={styles.pillText} numberOfLines={1}>
            {address}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#121B2E",
    justifyContent: "space-between",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.white,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(37, 99, 235, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heading: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.white,
    textAlign: "center",
  },
  hint: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: 8,
  },
  actions: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.heroBlue,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingVertical: 16,
  },
  secondaryBtnText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.white,
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: "#FFB4AB",
    textAlign: "center",
  },
  addressWrap: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(18, 27, 46, 0.7)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  pillText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.white,
    flexShrink: 1,
  },
});
