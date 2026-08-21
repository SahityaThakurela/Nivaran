import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../theme/tokens";
import { Icon } from "./Icon";

type AppHeaderProps = {
  variant: "home" | "back" | "brand";
  title?: string;
  onBack?: () => void;
  showActions?: boolean;
  dark?: boolean;
};

export function AppHeader({
  variant,
  title,
  onBack,
  showActions = true,
  dark = false,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const isBack = variant === "back";
  const iconColor = dark ? colors.white : colors.bodyMuted;
  const titleColor = dark ? colors.white : colors.brandNavy;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {isBack ? (
        <View style={styles.row}>
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            accessibilityLabel="Go back"
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
          <View style={styles.backSpacer} />
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
          {showActions ? (
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} accessibilityLabel="Notifications">
                <Icon name="bell" width={16} height={20} color={colors.bodyMuted} />
              </Pressable>
              <View style={styles.profileCircle}>
                <Icon name="profile" width={12} height={12} color={colors.white} />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    letterSpacing: -0.4,
    color: "#004AC6",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandBlueDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  backTitle: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  backSpacer: {
    width: 40,
  },
});
