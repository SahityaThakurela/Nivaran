import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ImageBackground,
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

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [address, setAddress] = useState("Locating…");

  useEffect(() => {
    let cancelled = false;
    async function loadLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setAddress("Location permission denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);

        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (cancelled) return;
          const p = places[0];
          if (p) {
            const parts = [p.name, p.street, p.city, p.region].filter(Boolean);
            setAddress(parts.join(", ") || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
          } else {
            setAddress(
              `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
            );
          }
        } catch {
          if (!cancelled) {
            setAddress(
              `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
            );
          }
        }
      } catch {
        if (!cancelled) setAddress("Unable to get location");
      }
    }
    void loadLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      goToDetails(result.assets[0].uri);
    }
  }

  async function openGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      allowsEditing: false,
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      goToDetails(result.assets[0].uri);
    }
  }

  function goToDetails(photoUri: string) {
    setPreviewUri(photoUri);
    navigation.navigate("ReportDetails", {
      photoUri,
      latitude,
      longitude,
      address: address === "Locating…" ? undefined : address,
      category,
    });
  }

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={
          previewUri
            ? { uri: previewUri }
            : require("../../assets/images/capture-placeholder.png")
        }
        style={styles.bg}
        resizeMode="cover"
      >
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

        <View style={styles.pills}>
          <View style={styles.pill}>
            <Icon name="pin" width={12} height={15} color={colors.white} />
            <Text style={styles.pillText} numberOfLines={1}>
              {address}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Keep the problem inside the frame</Text>
          </View>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => void openGallery()}
            style={styles.sideBtn}
            accessibilityLabel="Gallery"
          >
            <Icon name="gallery" width={24} height={24} color={colors.white} />
          </Pressable>

          <Pressable
            onPress={() => void openCamera()}
            style={styles.shutter}
            accessibilityLabel="Take photo"
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable style={styles.sideBtn} accessibilityLabel="Flash">
            <Icon name="flash" width={24} height={24} color={colors.white} />
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#121B2E",
  },
  bg: {
    flex: 1,
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
  pills: {
    alignItems: "center",
    gap: 8,
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
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 24,
    backgroundColor: "rgba(18, 27, 46, 0.85)",
  },
  sideBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
  },
});
