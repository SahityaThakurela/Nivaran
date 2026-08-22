import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../i18n/LanguageContext";
import { colors, fonts } from "../theme/tokens";
import { Icon } from "./Icon";

type Props = {
  visible: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Logout confirmation bottom sheet — Figma 53:8360.
 * https://www.figma.com/design/qeU2Ni1jVckdLZqqS258Ks/mp--Copy-?node-id=53-8360
 */
export function LogoutConfirmSheet({
  visible,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.scrim}
          onPress={busy ? undefined : onCancel}
          accessibilityLabel={t("profile.logoutCancel")}
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 48) },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Icon name="logout_exit" width={24} height={24} />
            </View>

            <Text style={styles.title}>{t("profile.logoutTitle")}</Text>
            <Text style={styles.body}>{t("profile.logoutBody")}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnDanger, busy && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t("profile.logoutConfirm")}
            >
              <Text style={styles.btnDangerText}>
                {busy ? t("profile.signingOut") : t("profile.logoutConfirm")}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnCancel, busy && styles.btnDisabled]}
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t("profile.logoutCancel")}
            >
              <Text style={styles.btnCancelText}>{t("profile.logoutCancel")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(18, 27, 46, 0.55)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 6,
    borderRadius: 9999,
    backgroundColor: "rgba(195, 198, 215, 0.5)",
  },
  content: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: colors.unresolvedBg,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.PlusJakartaSans_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.bodyMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  actions: {
    gap: 12,
    paddingTop: 8,
    width: "100%",
  },
  btn: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    width: "100%",
  },
  btnDanger: {
    backgroundColor: colors.danger,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  btnCancel: {
    backgroundColor: colors.softBlueAlt,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnDangerText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.white,
    textAlign: "center",
  },
  btnCancelText: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
    textAlign: "center",
  },
});
