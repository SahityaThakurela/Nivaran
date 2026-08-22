import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type NavTab } from "../components/BottomNav";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/iconAssets";
import { useLanguage } from "../i18n/LanguageContext";
import { handleTabNavigate } from "../navigation/tabNavigate";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "Profile">;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);

  function onNav(tab: NavTab) {
    handleTabNavigate(navigation, tab, "profile");
  }

  function onEditProfile() {
    Alert.alert(t("profile.edit"), t("profile.editUnavailable"));
  }

  async function onLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      });
    } finally {
      setLoggingOut(false);
    }
  }

  const initial = (user?.name?.trim()?.charAt(0) ?? "C").toUpperCase();

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="home"
        onNotifications={() => navigation.navigate("Notifications")}
        onProfile={() => undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? t("profile.citizen")}</Text>
          <Text style={styles.role}>
            {user?.role === "CITIZEN" || !user?.role
              ? t("profile.citizen")
              : user.role}
          </Text>
        </View>

        <Text style={styles.sectionHeader}>{t("profile.account")}</Text>
        <View style={styles.section}>
          <InfoRow
            icon="mail"
            label={t("profile.email")}
            value={user?.email ?? t("common.notSet")}
          />
          <InfoRow
            icon="phone"
            label={t("profile.phone")}
            value={user?.phone ?? t("common.notSet")}
          />
          <LinkRow
            icon="user"
            label={t("profile.edit")}
            onPress={onEditProfile}
          />
        </View>

        <Text style={styles.sectionHeader}>{t("profile.activity")}</Text>
        <View style={styles.section}>
          <LinkRow
            icon="nav_reports"
            label={t("profile.myReports")}
            onPress={() => navigation.navigate("MyReports")}
          />
          <LinkRow
            icon="bell"
            label={t("profile.notifications")}
            onPress={() => navigation.navigate("Notifications")}
          />
        </View>

        <Text style={styles.sectionHeader}>{t("profile.security")}</Text>
        <View style={styles.section}>
          <Pressable
            style={styles.logoutRow}
            onPress={() => void onLogout()}
            disabled={loggingOut}
          >
            <Icon name="logout" width={18} height={18} color={colors.danger} />
            <Text style={styles.logoutText}>
              {loggingOut ? t("profile.signingOut") : t("profile.logOut")}
            </Text>
          </Pressable>
          <View style={styles.shieldRow}>
            <Icon
              name="shield"
              width={16}
              height={16}
              color={colors.bodyMuted}
            />
            <Text style={styles.shieldText}>{t("profile.privacy")}</Text>
          </View>
        </View>
      </ScrollView>

      <BottomNav active="profile" onNavigate={onNav} />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} width={18} height={18} color={colors.brandBlueDeep} />
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <Icon name={icon} width={18} height={18} color={colors.brandBlueDeep} />
      <Text style={styles.linkLabel}>{label}</Text>
      <Icon name="chevron" width={6} height={9} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 28,
    color: colors.white,
  },
  name: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.brandNavy,
  },
  role: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 13,
    color: colors.bodyMuted,
    letterSpacing: 0.4,
  },
  sectionHeader: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    color: colors.brandBlueDeep,
    textTransform: "uppercase",
    marginTop: 8,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  infoBody: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    color: colors.brandNavy,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  linkLabel: {
    flex: 1,
    fontFamily: fonts.Inter_500Medium,
    fontSize: 15,
    color: colors.brandNavy,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(186, 26, 26, 0.06)",
  },
  logoutText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 15,
    color: colors.danger,
  },
  shieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shieldText: {
    flex: 1,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.bodyMuted,
  },
});
