import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ReportCategory } from "../api/types";
import { createIssue } from "../api/issues";
import { uploadIssuePhoto } from "../api/photos";
import { DEFAULT_CITY_ID } from "../api/config";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "ReportDetails">;
type Route = RouteProp<RootStackParamList, "ReportDetails">;

const CATEGORY_CHIPS: {
  labelKey: TranslationKey;
  value: ReportCategory;
  icon: IconName;
}[] = [
  { labelKey: "details.chipWater", value: "WATER_SUPPLY", icon: "water" },
  { labelKey: "details.chipDrainage", value: "DRAINAGE", icon: "drainage" },
  { labelKey: "details.chipRoads", value: "ROADS", icon: "roads" },
  { labelKey: "details.chipGarbage", value: "SANITATION", icon: "garbage" },
  { labelKey: "details.chipStreetlight", value: "STREETLIGHT", icon: "streetlight" },
  { labelKey: "details.chipOther", value: "OTHER", icon: "other" },
];

const VALID_CATEGORIES = new Set<string>([
  "ROADS",
  "SANITATION",
  "WATER_SUPPLY",
  "ELECTRICITY",
  "DRAINAGE",
  "STREETLIGHT",
  "PUBLIC_SAFETY",
  "PARKS_AND_TREES",
  "STRAY_ANIMALS",
  "OTHER",
]);

function asReportCategory(value?: string | null): ReportCategory | null {
  if (value && VALID_CATEGORIES.has(value)) return value as ReportCategory;
  return null;
}

const MAX_DESC = 500;

export function ReportDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const { photoUri, category: initialCategory } = route.params;

  const [latitude, setLatitude] = useState(route.params.latitude);
  const [longitude, setLongitude] = useState(route.params.longitude);
  const [address, setAddress] = useState(route.params.address);
  const [category, setCategory] = useState<ReportCategory | null>(
    (initialCategory as ReportCategory | undefined) ?? null,
  );
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const descriptionOffsetY = useRef(0);
  const descriptionFocused = useRef(false);

  useEffect(() => {
    setLatitude(route.params.latitude);
    setLongitude(route.params.longitude);
    setAddress(route.params.address);
    if (route.params.category) {
      setCategory(route.params.category as ReportCategory);
    }
  }, [
    route.params.latitude,
    route.params.longitude,
    route.params.address,
    route.params.category,
  ]);

  useEffect(() => {
    const event =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(event, () => {
      if (descriptionFocused.current) {
        scrollDescriptionIntoView();
      }
    });
    return () => sub.remove();
  }, []);

  function openAdjustMap() {
    navigation.navigate("AdjustMap", {
      latitude,
      longitude,
      photoUri,
      category: category ?? initialCategory,
    });
  }

  function scrollDescriptionIntoView() {
    const delay = Platform.OS === "ios" ? 50 : 100;
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, descriptionOffsetY.current - 12),
        animated: true,
      });
    }, delay);
  }

  async function handleSubmit() {
    if (!token) {
      setError(t("details.signInAgain"));
      return;
    }
    const cityId = user?.cityId || DEFAULT_CITY_ID;
    if (!cityId) {
      setError(t("details.missingCity"));
      return;
    }
    if (!description.trim()) {
      setError(t("details.needDescription"));
      return;
    }
    if (!latitude || !longitude) {
      setError(t("details.needLocation"));
      return;
    }

    const selectedCategory =
      category ?? asReportCategory(initialCategory);

    if (!selectedCategory) {
      setError(t("details.needCategory"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const photoUrl = await uploadIssuePhoto(token, photoUri);
      const report = await createIssue(token, {
        description: `[${selectedCategory}] ${description.trim()}`,
        cityId,
        latitude,
        longitude,
        address,
        photoUrls: [photoUrl],
        category: selectedCategory,
      });
      navigation.replace("ReportSubmitted", {
        issueId: report.id,
        category: selectedCategory,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("details.failedSubmit"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title={t("details.title")}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroWrap}>
            <Image
              source={{ uri: photoUri }}
              style={styles.hero}
              resizeMode="cover"
            />
            <Pressable style={styles.retake} onPress={() => navigation.goBack()}>
              <Icon name="retake" width={20} height={20} />
              <Text style={styles.retakeText}>{t("details.retake")}</Text>
            </Pressable>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationTop}>
              <Icon
                name="pin"
                width={12}
                height={15}
                color={colors.brandBlueDeep}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationLabel}>{t("details.location")}</Text>
                <Text style={styles.locationValue}>
                  {address ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
                </Text>
              </View>
              <Pressable onPress={openAdjustMap}>
                <Text style={styles.adjust}>{t("details.adjustMap")}</Text>
              </Pressable>
            </View>
            <Pressable onPress={openAdjustMap}>
              <Image
                source={require("../../assets/images/map-preview.png")}
                style={styles.mapPreview}
                resizeMode="cover"
              />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>{t("details.category")}</Text>
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
                    {t(chip.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View
            onLayout={(e) => {
              descriptionOffsetY.current = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionLabel}>{t("details.description")}</Text>
            <View style={styles.textareaWrap}>
              <TextInput
                style={styles.textarea}
                multiline
                maxLength={MAX_DESC}
                value={description}
                onChangeText={setDescription}
                onFocus={() => {
                  descriptionFocused.current = true;
                  scrollDescriptionIntoView();
                }}
                onBlur={() => {
                  descriptionFocused.current = false;
                }}
                placeholder={t("details.placeholder")}
                placeholderTextColor={colors.placeholder}
                textAlignVertical="top"
              />
              <Text style={styles.counter}>
                {description.length}/{MAX_DESC}
              </Text>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            label={busy ? t("details.uploading") : t("details.submit")}
            onPress={() => void handleSubmit()}
            iconRight="send"
            disabled={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 160,
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
    marginTop: 8,
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
