import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../i18n/LanguageContext";
import { colors, fonts } from "../theme/tokens";
import { Icon } from "./Icon";
import { LanguageToggle } from "./LanguageToggle";

type AppHeaderProps = {
  variant: "home" | "back" | "brand";
  title?: string;
  onBack?: () => void;
  showActions?: boolean;
  dark?: boolean;
  onNotifications?: () => void;
  onProfile?: () => void;
};

export function AppHeader({
  variant,
  title,
  onBack,
  showActions = true,
  dark = false,
  onNotifications,
  onProfile,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const isBack = variant === "back";
  const iconColor = dark ? colors.white : colors.bodyMuted;
  const titleColor = dark ? colors.white : colors.brandNavy;

  const actions = showActions ? (
    <View style={styles.actions}>
      <LanguageToggle />
      <Pressable
        style={styles.actionBtn}
        accessibilityLabel={t("common.notifications")}
        onPress={onNotifications}
      >
        <Icon name="bell" width={16} height={20} color={colors.bodyMuted} />
      </Pressable>
      <Pressable
        style={styles.profileCircle}
        accessibilityLabel={t("common.profile")}
        onPress={onProfile}
      >
        <Icon name="profile" width={12} height={12} color={colors.white} />
      </Pressable>
    </View>
  ) : null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {isBack ? (
        <View style={styles.row}>
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            accessibilityLabel={t("common.goBack")}
          >
            <Icon name="back" width={16} height={16} color={iconColor} />
          </Pressable>
          <View style={styles.backTitleRow}>
            {!dark ? (
              <Image
                source={require("../../assets/images/home-logo.png")}
                style={styles.smallLogo}
                resizeMode="contain"
              />
            ) : null}
            {title ? (
              <Text style={[styles.backTitle, { color: titleColor }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>
          {actions ?? <View style={styles.backSpacer} />}
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../assets/images/home-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>NIVARAN</Text>
          </View>
          {actions}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(249, 249, 255, 0.95)",
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  row: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  logo: {
    width: 32,
    height: 32,
  },
  smallLogo: {
    width: 24,
    height: 24,
  },
  brandName: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandBlueDeep,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  backTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  backSpacer: {
    width: 72,
  },
});
