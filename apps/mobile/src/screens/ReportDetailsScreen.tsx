import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ReportCategory } from "../api/types";
import { createIssue } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "ReportDetails">;
type Route = RouteProp<RootStackParamList, "ReportDetails">;

const CATEGORY_CHIPS: {
  label: string;
  value: ReportCategory;
  icon: IconName;
}[] = [
  { label: "Water", value: "WATER_SUPPLY", icon: "water" },
  { label: "Drainage", value: "DRAINAGE", icon: "drainage" },
  { label: "Roads", value: "ROADS", icon: "roads" },
  { label: "Garbage", value: "SANITATION", icon: "garbage" },
  { label: "Streetlight", value: "STREETLIGHT", icon: "streetlight" },
  { label: "Other", value: "OTHER", icon: "other" },
];

const MAX_DESC = 500;

export function ReportDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token, user } = useAuth();
  const { photoUri, latitude, longitude, address, category: initialCategory } =
    route.params;

  const [category, setCategory] = useState<ReportCategory | null>(
    (initialCategory as ReportCategory | undefined) ?? null,
  );
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!token) {
      setError("Please sign in again.");
      return;
    }
    const cityId = user?.cityId || process.env.EXPO_PUBLIC_DEFAULT_CITY_ID;
    if (!cityId) {
      setError("Missing city ID. Set EXPO_PUBLIC_DEFAULT_CITY_ID in .env.");
      return;
    }
    if (!description.trim()) {
      setError("Please add a short description.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const report = await createIssue(token, {
        description: category
          ? `[${category}] ${description.trim()}`
          : description.trim(),
        cityId,
        latitude,
        longitude,
        address,
        photoUrls: [photoUri],
      });
      navigation.replace("TrackIssue", { issueId: report.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title="Report Details"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: photoUri }} style={styles.hero} resizeMode="cover" />
          <Pressable style={styles.retake} onPress={() => navigation.goBack()}>
            <Icon name="retake" width={20} height={20} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationTop}>
            <Icon name="pin" width={12} height={15} color={colors.brandBlueDeep} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>Location</Text>
              <Text style={styles.locationValue}>
                {address ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
              </Text>
            </View>
            <Pressable onPress={() => undefined}>
              <Text style={styles.adjust}>Adjust Map</Text>
            </Pressable>
          </View>
          <Image
            source={require("../../assets/images/map-preview.png")}
            style={styles.mapPreview}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.chips}>
          {CATEGORY_CHIPS.map((chip) => {
            const selected = category === chip.value;
            return (
              <Pressable
                key={chip.value}
                onPress={() => setCategory(chip.value)}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipIdle,
                ]}
              >
                <Icon
                  name={chip.icon}
                  width={14}
                  height={14}
                  color={selected ? colors.white : colors.bodyMuted}
                />
                <Text
                  style={[
                    styles.chipText,
                    selected ? styles.chipTextSelected : null,
                  ]}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Description</Text>
        <View style={styles.textareaWrap}>
          <TextInput
            style={styles.textarea}
            multiline
            maxLength={MAX_DESC}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue…"
            placeholderTextColor={colors.placeholder}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {description.length}/{MAX_DESC}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          label="Submit Report"
          onPress={() => void handleSubmit()}
          iconRight="send"
          disabled={busy}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  heroWrap: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  hero: {
    width: "100%",
    height: 200,
    backgroundColor: colors.softBlue,
  },
  retake: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retakeText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    color: colors.brandNavy,
  },
  locationCard: {
    backgroundColor: colors.softBlue,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  locationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  locationLabel: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.brandBlueDeep,
  },
  locationValue: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.brandNavy,
  },
  adjust: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    color: colors.brandBlueDeep,
  },
  mapPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  sectionLabel: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: "#004AC6",
  },
  chipIdle: {
    backgroundColor: "#E1E8FF",
  },
  chipText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.bodyMuted,
  },
  chipTextSelected: {
    color: colors.white,
  },
  textareaWrap: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    padding: 12,
    minHeight: 120,
  },
  textarea: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
    minHeight: 88,
  },
  counter: {
    alignSelf: "flex-end",
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  error: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.danger,
  },
});
