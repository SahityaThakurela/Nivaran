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
import type { ChallengeDomain } from "../api/types";
import { createIssue, getReportRejection, type ReportRejection } from "../api/issues";
import { uploadIssuePhoto } from "../api/photos";
import { DEFAULT_CITY_ID } from "../api/config";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { AppButton } from "../components/FormControls";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import {
  fetchDeviceLocation,
  hasValidCoords,
} from "../location/deviceLocation";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "ReportDetails">;
type Route = RouteProp<RootStackParamList, "ReportDetails">;

const DOMAIN_CHIPS: {
  labelKey: TranslationKey;
  value: ChallengeDomain;
  icon: IconName;
}[] = [
  { labelKey: "details.chipEducation", value: "EDUCATION", icon: "people" },
  { labelKey: "details.chipHealthcare", value: "HEALTHCARE", icon: "shield" },
  { labelKey: "details.chipAgriculture", value: "AGRICULTURE", icon: "sanitation" },
  { labelKey: "details.chipWater", value: "WATER_RESOURCES", icon: "water" },
  { labelKey: "details.chipEnvironment", value: "ENVIRONMENT", icon: "drainage" },
  { labelKey: "details.chipEnergy", value: "ENERGY", icon: "electricity" },
  { labelKey: "details.chipUrban", value: "URBAN_DEVELOPMENT", icon: "roads" },
  { labelKey: "details.chipAccessibility", value: "ACCESSIBILITY", icon: "eye" },
  { labelKey: "details.chipPublicAdmin", value: "PUBLIC_ADMINISTRATION", icon: "hardhat" },
  { labelKey: "details.chipRural", value: "RURAL_LIVELIHOODS", icon: "citizens" },
  { labelKey: "details.chipOther", value: "OTHER", icon: "other" },
];

const VALID_DOMAINS = new Set<string>([
  "EDUCATION",
  "HEALTHCARE",
  "AGRICULTURE",
  "WATER_RESOURCES",
  "ENVIRONMENT",
  "ENERGY",
  "URBAN_DEVELOPMENT",
  "ACCESSIBILITY",
  "PUBLIC_ADMINISTRATION",
  "RURAL_LIVELIHOODS",
  "OTHER",
]);

function asChallengeDomain(value?: string | null): ChallengeDomain | null {
  if (value && VALID_DOMAINS.has(value)) return value as ChallengeDomain;
  return null;
}

const MAX_DESC = 500;

export function ReportDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const { photoUri, domain: initialDomain } = route.params;

  const [latitude, setLatitude] = useState(route.params.latitude);
  const [longitude, setLongitude] = useState(route.params.longitude);
  const [address, setAddress] = useState(route.params.address);
  const [category, setCategory] = useState<ChallengeDomain | null>(
    (initialDomain as ChallengeDomain | undefined) ?? null,
  );
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<ReportRejection | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const descriptionOffsetY = useRef(0);
  const descriptionFocused = useRef(false);

  useEffect(() => {
    setLatitude(route.params.latitude);
    setLongitude(route.params.longitude);
    setAddress(route.params.address);
    if (route.params.domain) {
      setCategory(route.params.domain as ChallengeDomain);
    }
  }, [
    route.params.latitude,
    route.params.longitude,
    route.params.address,
    route.params.domain,
  ]);

  // If Capture raced ahead of GPS (0,0), resolve location on this screen.
  useEffect(() => {
    if (hasValidCoords(route.params.latitude, route.params.longitude)) {
      return;
    }
    let cancelled = false;
    setAddress(t("capture.locating"));
    void (async () => {
      try {
        const loc = await fetchDeviceLocation();
        if (cancelled) return;
        setLatitude(loc.latitude);
        setLongitude(loc.longitude);
        setAddress(loc.address);
      } catch {
        if (!cancelled) {
          setAddress(t("capture.unableLocation"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params.latitude, route.params.longitude, t]);

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
      domain: category ?? initialDomain,
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
      setRejection(null);
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

    const selectedDomain =
      category ?? asChallengeDomain(initialDomain);

    if (!selectedDomain) {
      setError(t("details.needCategory"));
      return;
    }

    setBusy(true);
    setError(null);
    setRejection(null);
    try {
      const photoUrl = await uploadIssuePhoto(token, photoUri);
      const report = await createIssue(token, {
        description: `[${selectedDomain}] ${description.trim()}`,
        cityId,
        latitude,
        longitude,
        address,
        photoUrls: [photoUrl],
        domain: selectedDomain,
      });
      navigation.replace("TrackIssue", {
        issueId: report.id,
        animateTimeline: true,
      });
    } catch (e) {
      const rejected = getReportRejection(e);
      if (rejected) {
        setRejection(rejected);
        setError(null);
      } else {
        setRejection(null);
        setError(e instanceof Error ? e.message : t("details.failedSubmit"));
      }
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
            {DOMAIN_CHIPS.map((chip) => {
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

          {rejection ? (
            <RejectionCard
              rejection={rejection}
              t={t}
              onChangePhoto={() => navigation.goBack()}
            />
          ) : error ? (
            <View style={styles.softError}>
              <Text style={styles.softErrorText}>{error}</Text>
            </View>
          ) : null}

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

const MISMATCH_KEYS: Record<string, TranslationKey> = {
  IRRELEVANT_SUBJECT: "details.mismatch.IRRELEVANT_SUBJECT",
  NO_VISIBLE_ISSUE: "details.mismatch.NO_VISIBLE_ISSUE",
  TEXT_IMAGE_MISMATCH: "details.mismatch.TEXT_IMAGE_MISMATCH",
  LOW_QUALITY_UNVERIFIABLE: "details.mismatch.LOW_QUALITY_UNVERIFIABLE",
  INAPPROPRIATE_OR_UNSAFE: "details.mismatch.INAPPROPRIATE_OR_UNSAFE",
  SPAM_OR_TEST_SUBMISSION: "details.mismatch.SPAM_OR_TEST_SUBMISSION",
};

function RejectionCard({
  rejection,
  t,
  onChangePhoto,
}: {
  rejection: ReportRejection;
  t: (key: TranslationKey) => string;
  onChangePhoto: () => void;
}) {
  const mismatchKey = rejection.mismatchType
    ? MISMATCH_KEYS[rejection.mismatchType]
    : undefined;

  return (
    <View style={styles.rejectCard}>
      <View style={styles.rejectIcon}>
        <Icon name="close_x" width={16} height={16} color="#93000A" />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={styles.rejectTitle}>
          {mismatchKey ? t(mismatchKey) : t("details.rejectTitle")}
        </Text>
        <Text style={styles.rejectReason}>{rejection.reason}</Text>
        {rejection.imageFindings ? (
          <View style={styles.findingsBox}>
            <Text style={styles.findingsLabel}>{t("details.rejectPhotoShows")}</Text>
            <Text style={styles.findingsText}>{rejection.imageFindings}</Text>
          </View>
        ) : null}
        <Text style={styles.rejectHint}>{t("details.rejectHint")}</Text>
        <Pressable style={styles.rejectCta} onPress={onChangePhoto}>
          <Icon name="retake" width={16} height={16} />
          <Text style={styles.rejectCtaText}>{t("details.rejectChangePhoto")}</Text>
        </Pressable>
      </View>
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
  rejectCard: {
    backgroundColor: colors.unresolvedBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  rejectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(147, 0, 10, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.unresolvedText,
  },
  rejectReason: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.brandNavy,
  },
  findingsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  findingsLabel: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.unresolvedText,
  },
  findingsText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.bodyMuted,
  },
  rejectHint: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.bodyMuted,
  },
  rejectCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rejectCtaText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    color: colors.brandNavy,
  },
  softError: {
    backgroundColor: colors.mustardSoft,
    borderRadius: 12,
    padding: 14,
  },
  softErrorText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mustard,
  },
});
