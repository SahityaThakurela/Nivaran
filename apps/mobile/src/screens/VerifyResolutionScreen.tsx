import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Report } from "../api/types";
import { getIssue } from "../api/issues";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { Icon } from "../components/Icon";
import { useLanguage } from "../i18n/LanguageContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";
import { pickRemotePhotoUrl } from "../utils/photoUrl";
import { verifiedStorageKey } from "../utils/notifications";

type Nav = NativeStackNavigationProp<RootStackParamList, "VerifyResolution">;
type Route = RouteProp<RootStackParamList, "VerifyResolution">;

export function VerifyResolutionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token } = useAuth();
  const { t, categoryLabel } = useLanguage();
  const { issueId } = route.params;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError(t("verify.notSignedIn"));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getIssue(token, issueId);
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("verify.failedLoad"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, issueId, t]);

  async function onConfirm() {
    setSaving(true);
    try {
      await AsyncStorage.setItem(verifiedStorageKey(issueId), "1");
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  function onUnresolved() {
    navigation.navigate("TrackIssue", { issueId });
  }

  const beforeUri = pickRemotePhotoUrl(report?.photoUrls);
  const beforeSource = beforeUri
    ? { uri: beforeUri }
    : require("../../assets/images/verify-before.png");

  const afterUri = pickRemotePhotoUrl(report?.resolutionEvidenceUrls);
  const afterSource = afterUri
    ? { uri: afterUri }
    : require("../../assets/images/verify-after.png");

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="back"
        title={t("verify.title")}
        onBack={() => navigation.goBack()}
        showActions={false}
      />

      {loading ? (
        <ActivityIndicator
          color={colors.brandBlueDeep}
          style={{ marginTop: 40 }}
        />
      ) : error || !report ? (
        <Text style={styles.error}>{error ?? t("verify.notFound")}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.banner}>
            <Icon
              name="confirm_check"
              width={20}
              height={20}
              color={colors.resolvedDark}
            />
            <Text style={styles.bannerText}>{t("verify.banner")}</Text>
          </View>

          <Text style={styles.issueTitle}>
            {report.category
              ? categoryLabel(report.category)
              : t("common.issue")}
          </Text>
          <Text style={styles.address}>
            {report.address ?? t("common.locationPending")}
          </Text>

          <View style={styles.compare}>
            <View style={styles.photoCol}>
              <Text style={styles.photoLabel}>{t("verify.before")}</Text>
              <Image
                source={beforeSource}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
            <View style={styles.photoCol}>
              <Text style={styles.photoLabel}>{t("verify.after")}</Text>
              <Image
                source={afterSource}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          </View>

          <Pressable
            style={[styles.confirmBtn, saving && styles.btnDisabled]}
            onPress={() => void onConfirm()}
            disabled={saving}
          >
            <Icon
              name="confirm_check"
              width={18}
              height={18}
              color={colors.white}
            />
            <Text style={styles.confirmText}>
              {saving ? t("verify.saving") : t("verify.confirmFixed")}
            </Text>
          </Pressable>

          <Pressable style={styles.unresolvedBtn} onPress={onUnresolved}>
            <Icon
              name="close_x"
              width={14}
              height={14}
              color={colors.unresolvedText}
            />
            <Text style={styles.unresolvedText}>{t("verify.stillUnresolved")}</Text>
          </Pressable>
        </ScrollView>
      )}
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
    gap: 14,
    paddingBottom: 32,
  },
  error: {
    margin: 24,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.danger,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.resolvedBanner,
    borderRadius: 12,
    padding: 14,
  },
  bannerText: {
    flex: 1,
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.resolvedText,
  },
  issueTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  address: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
    marginTop: -6,
  },
  compare: {
    flexDirection: "row",
    gap: 12,
  },
  photoCol: {
    flex: 1,
    gap: 8,
  },
  photoLabel: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    color: colors.bodyMuted,
  },
  photo: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.resolvedDark,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.white,
  },
  unresolvedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.unresolvedBg,
    borderRadius: 12,
    paddingVertical: 14,
  },
  unresolvedText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.unresolvedText,
  },
});
