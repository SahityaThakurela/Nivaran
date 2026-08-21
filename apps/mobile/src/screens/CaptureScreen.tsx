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
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "Capture">;
type Route = RouteProp<RootStackParamList, "Capture">;

export function CaptureScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const category = route.params?.category;
  const cameraLaunched = useRef(false);

  const [busy, setBusy] = useState(true);
  const [address, setAddress] = useState("Locating…");
  const locationRef = useRef({ latitude: 0, longitude: 0, address: "Locating…" });

  useEffect(() => {
    let cancelled = false;
    async function loadLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setAddress("Location permission denied");
            locationRef.current.address = "Location permission denied";
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
          setAddress("Unable to get location");
          locationRef.current.address = "Unable to get location";
        }
      }
    }
    void loadLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToDetails(photoUri: string) {
    const loc = locationRef.current;
    navigation.replace("ReportDetails", {
      photoUri,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address === "Locating…" ? undefined : loc.address,
      category,
    });
  }

  async function openCamera() {
    setBusy(true);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setBusy(false);
      return false;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      goToDetails(result.assets[0].uri);
      return true;
    }
    setBusy(false);
    return false;
  }

  async function openGallery() {
    setBusy(true);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setBusy(false);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: false,
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      goToDetails(result.assets[0].uri);
      return;
    }
    setBusy(false);
  }

  // Open the system camera as soon as this screen mounts — no sample image.
  useEffect(() => {
    if (cameraLaunched.current) return;
    cameraLaunched.current = true;

    void (async () => {
      const tookPhoto = await openCamera();
      if (!tookPhoto && navigation.canGoBack()) {
        // User cancelled or denied camera — leave Capture instead of showing a fake preview.
        navigation.goBack();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- launch once on mount
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Icon name="back" width={16} height={16} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>Report a Problem</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.center}>
        {busy ? (
          <>
            <ActivityIndicator color={colors.white} size="large" />
            <Text style={styles.hint}>Opening camera…</Text>
          </>
        ) : (
          <>
            <Text style={styles.hint}>Take a photo or choose from gallery</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => void openCamera()}
                style={styles.primaryBtn}
                accessibilityLabel="Open camera"
              >
                <Icon name="camera" width={20} height={18} color={colors.heroBlue} />
                <Text style={styles.primaryBtnText}>Open camera</Text>
              </Pressable>
              <Pressable
                onPress={() => void openGallery()}
                style={styles.secondaryBtn}
                accessibilityLabel="Gallery"
              >
                <Icon name="gallery" width={20} height={20} color={colors.white} />
                <Text style={styles.secondaryBtnText}>Gallery</Text>
              </Pressable>
            </View>
          </>
        )}
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
    gap: 16,
    paddingHorizontal: 24,
  },
  hint: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    textAlign: "center",
    opacity: 0.85,
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
    borderRadius: 10,
    paddingVertical: 14,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingVertical: 14,
  },
  secondaryBtnText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 15,
    color: colors.white,
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
