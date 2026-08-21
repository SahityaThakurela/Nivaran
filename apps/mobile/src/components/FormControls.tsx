import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInputProps,
  TextInput,
} from "react-native";
import { colors, fonts } from "../theme/tokens";
import type { IconName } from "./iconAssets";
import { Icon } from "./Icon";

type TextFieldProps = TextInputProps & {
  label: string;
  leftIcon?: IconName;
  rightSlot?: React.ReactNode;
  labelRight?: React.ReactNode;
};

export function TextField({
  label,
  leftIcon,
  rightSlot,
  labelRight,
  style,
  ...props
}: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRight}
      </View>
      <View style={styles.inputShell}>
        {leftIcon ? (
          <View style={styles.leftIcon}>
            <Icon name={leftIcon} width={16} height={16} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.placeholder}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            rightSlot ? styles.inputWithRight : null,
            style,
          ]}
          {...props}
        />
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  iconRight?: IconName;
  iconLeft?: IconName;
  disabled?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  iconRight,
  iconLeft,
  disabled,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnSecondary,
        pressed && !disabled ? styles.btnPressed : null,
        disabled ? styles.btnDisabled : null,
      ]}
    >
      {iconLeft ? (
        <Icon
          name={iconLeft}
          width={16}
          height={12}
          color={isPrimary ? colors.white : colors.brandBlueDeep}
        />
      ) : null}
      <Text style={[styles.btnLabel, isPrimary ? styles.btnLabelPrimary : styles.btnLabelSecondary]}>
        {label}
      </Text>
      {iconRight ? (
        <Icon
          name={iconRight}
          width={12}
          height={12}
          color={isPrimary ? colors.white : colors.brandBlueDeep}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.brandNavy,
  },
  inputShell: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    color: colors.brandNavy,
  },
  inputWithLeft: {
    paddingLeft: 40,
  },
  inputWithRight: {
    paddingRight: 44,
  },
  leftIcon: {
    position: "absolute",
    left: 16,
    top: 16,
    zIndex: 1,
  },
  rightSlot: {
    position: "absolute",
    right: 8,
    top: 6,
  },
  btn: {
    height: 48,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: colors.brandBlueDeep,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  btnSecondary: {
    backgroundColor: colors.softBlueBtn,
    borderWidth: 1,
    borderColor: "rgba(0, 74, 198, 0.2)",
  },
  btnPressed: {
    opacity: 0.9,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnLabel: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  btnLabelPrimary: {
    color: colors.white,
  },
  btnLabelSecondary: {
    color: colors.brandBlueDeep,
  },
});
