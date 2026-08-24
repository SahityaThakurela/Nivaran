import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
  const { t, domainLabel } = useLanguage();
  const { photoUri, domain: initialDomain } = route.params;

  const [latitude, setLatitude] = useState(route.params.latitude);
  const [longitude, setLongitude] = useState(route.params.longitude);
  const [address, setAddress] = useState(route.params.address);
  const [category, setCategory] = useState<ChallengeDomain | null>(
    (initialDomain as ChallengeDomain | undefined) ?? null,
  );
  const [description, setDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issueIdReady, setIssueIdReady] = useState<string | null>(null);
  const [processingDomain, setProcessingDomain] = useState<ChallengeDomain | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<ReportRejection | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const descriptionOffsetY = useRef(0);
  const descriptionFocused = useRef(false);
  const cancelRequestedRef = useRef(false);

  const [progressStage, setProgressStage] = useState<0 | 1 | 2>(0);
  const severityBar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!processing) return;
    setProgressStage(0);
    const t1 = setTimeout(() => setProgressStage(1), 700);
    const t2 = setTimeout(() => setProgressStage(2), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [processing]);

  useEffect(() => {
    if (!processing || progressStage !== 2) return;
    let cancelled = false;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(severityBar, {
          toValue: 1,
          duration: 1050,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: false,
        }),
        Animated.timing(severityBar, {
          toValue: 0.15,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    if (!cancelled) loop.start();
    return () => {
      cancelled = true;
      loop.stop();
    };
  }, [processing, progressStage, severityBar]);

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

    cancelRequestedRef.current = false;
    setProcessing(true);
    setSubmitting(true);
    setIssueIdReady(null);
    setProcessingDomain(selectedDomain);
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
      if (cancelRequestedRef.current) return;
      setIssueIdReady(report.id);
    } catch (e) {
      if (cancelRequestedRef.current) return;
      setProcessing(false);
      setSubmitting(false);
      setIssueIdReady(null);
      setProcessingDomain(null);
      const rejected = getReportRejection(e);
      if (rejected) {
        setRejection(rejected);
        setError(null);
      } else {
        setRejection(null);
        setError(e instanceof Error ? e.message : t("details.failedSubmit"));
      }
    } finally {
      if (!cancelRequestedRef.current) setSubmitting(false);
    }
  }

  function cancelProcessing() {
    cancelRequestedRef.current = true;
    setProcessing(false);
    setSubmitting(false);
    setIssueIdReady(null);
    setProcessingDomain(null);
    setError(null);
    setRejection(null);
  }

  function continueToTrack() {
    if (!issueIdReady) return;
    setProcessing(false);
    setSubmitting(false);
    navigation.replace("TrackIssue", { issueId: issueIdReady, animateTimeline: true });
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
          {/* While submitting, keep showing the underlying page but show the Figma-style processing overlay */}
          {processing ? (
            <View style={styles.processingOverlay} pointerEvents="box-none">
              <View style={styles.processingBento}>
                <View style={styles.processingTitleRow}>
                  <View style={styles.processingPulseDot} />
                  <Text style={styles.processingTitle}>
                    {submitting ? "Working in the background…" : "Almost done…"}
                  </Text>
                </View>
                <View style={styles.progressList}>
                  <ProgressRow
                    state={progressStage > 0 ? "done" : "current"}
                    title="Detecting issue"
                    subtitle="Infrastructure damage found"
                  />
                  <ProgressRow
                    state={progressStage > 1 ? "done" : progressStage === 1 ? "current" : "pending"}
                    title="Identifying category"
                    subtitle={
                      processingDomain
                        ? `Categorized as '${domainLabel(processingDomain)}'`
                        : "Categorizing…"
                    }
                  />
                  <ProgressRow
                    state={progressStage === 2 ? "current" : "pending"}
                    title="Estimating severity..."
                    subtitle={undefined}
                    severityBar={
                      progressStage === 2 ? (
                        <View style={styles.severityBarTrack}>
                          <Animated.View
                            style={[
                              styles.severityBarFill,
                              { transform: [{ scaleX: severityBar }] },
                            ]}
                          />
                        </View>
                      ) : null
                    }
                  />
                  <ProgressRow
                    state={"pending"}
                    title="Finding location context"
                    subtitle={undefined}
                  />
                  <ProgressRow
                    state={"pending"}
                    title="Checking similar reports"
                    subtitle={undefined}
                  />
                </View>
                <View style={styles.processingHelpRow}>
                  <Text style={styles.processingHelp}>
                    Your photo and details are being validated, and your report is being prepared for the next step.
                  </Text>
                </View>
              </View>

              <View style={styles.processingFooter}>
                <Pressable
                  style={[styles.continueBtn, !issueIdReady && styles.continueBtnDisabled]}
                  disabled={!issueIdReady}
                  onPress={continueToTrack}
                >
                  <Text style={styles.continueBtnText}>Continue</Text>
                </Pressable>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={cancelProcessing}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

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
            label={submitting ? t("details.uploading") : t("details.submit")}
            onPress={() => void handleSubmit()}
            iconRight="send"
            disabled={processing || submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ProgressRow({
  state,
  title,
  subtitle,
  severityBar,
}: {
  state: "done" | "current" | "pending";
  title: string;
  subtitle?: string | undefined;
  severityBar?: React.ReactNode;
}) {
  const isDone = state === "done";
  const isCurrent = state === "current";
  const isPending = state === "pending";

  const dotBg = isDone ? colors.statusResolvedBg : isCurrent ? "#DBE1FF" : "transparent";
  const dotBorder = isPending ? colors.dragHandle : "transparent";
  return (
    <View style={[styles.progressRow, isPending && styles.progressRowPending]}>
      <View
        style={[
          styles.progressDotOuter,
          { backgroundColor: dotBg, borderColor: dotBorder },
        ]}
      >
        {isDone ? (
          <Icon name="check" width={12} height={8} color={colors.white} />
        ) : null}
        {isCurrent ? (
          <View style={styles.currentDotInner} />
        ) : null}
      </View>
      <View style={styles.progressRowText}>
        <Text style={styles.progressTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.progressSubtitle}>{subtitle}</Text>
        ) : null}
        {severityBar ? severityBar : null}
      </View>
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

  processingOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(249,249,255,0.78)",
    zIndex: 50,
    justifyContent: "center",
  },
  processingBento: {
    marginHorizontal: 16,
    backgroundColor: colors.logoCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(195,198,215,0.2)",
    shadowColor: "#172033",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  processingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  processingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7CF994",
  },
  processingTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.brandNavy,
  },
  progressList: {
    gap: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  progressRowPending: {
    opacity: 0.5,
  },
  progressDotOuter: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  currentDotInner: {
    width: 18,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.brandBlueDeep,
    opacity: 0.95,
  },
  progressRowText: {
    flex: 1,
    gap: 3,
  },
  progressTitle: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.brandNavy,
    letterSpacing: 0.14,
  },
  progressSubtitle: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 17,
    color: "#006E2D",
  },
  severityBarTrack: {
    height: 6,
    width: 96,
    backgroundColor: "#E1E8FF",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  severityBarFill: {
    height: "100%",
    width: "100%",
    backgroundColor: colors.brandBlueDeep,
    transform: [{ scaleX: 0.15 }],
    transformOrigin: "left",
  },
  processingHelpRow: {
    marginTop: 10,
  },
  processingHelp: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.bodyMuted60,
  },
  processingFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 16,
    gap: 12,
    alignItems: "center",
  },
  continueBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnDisabled: {
    opacity: 0.45,
  },
  continueBtnText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 18,
    lineHeight: 24,
    color: colors.white,
  },
  cancelBtn: {
    width: 140,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(195,198,215,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.bodyMuted,
  },
});
