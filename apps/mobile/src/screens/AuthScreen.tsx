import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { DEFAULT_CITY_ID } from "../api/config";
import { AppButton, TextField } from "../components/FormControls";
import { Icon } from "../components/Icon";
import type { RootStackParamList } from "../navigation/types";
import { colors, fonts } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "Auth">;
type Mode = "login" | "signup";

export function AuthScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleContinue() {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError("Please enter your name.");
          setBusy(false);
          return;
        }
        const isEmail = identifier.includes("@");
        await register({
          name: trimmedName,
          ...(isEmail ? { email: identifier.trim() } : { phone: identifier.trim() }),
          password,
          cityId: DEFAULT_CITY_ID,
        });
      } else {
        const isEmail = identifier.includes("@");
        await login({
          ...(isEmail ? { email: identifier.trim() } : { phone: identifier.trim() }),
          password,
        });
      }
      navigation.replace("Home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCitizen() {
    setError(null);
    setBusy(true);
    try {
      await register({
        name: "Citizen",
        phone: `c${Date.now()}`,
        password: "citizen123",
        cityId: DEFAULT_CITY_ID,
      });
      navigation.replace("Home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image
            source={require("../../assets/images/login-logo.png")}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={styles.brandName}>NIVARAN</Text>
          <Text style={styles.tagline}>
            Make your city better, one report at a time.
          </Text>
        </View>

        <View style={styles.card}>
          {mode === "signup" ? (
            <TextField
              label="Name"
              leftIcon="user"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Your name"
            />
          ) : null}

          <TextField
            label="Phone / Email"
            leftIcon="user"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="phone or email"
          />

          <TextField
            label="Password"
            leftIcon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Password"
            labelRight={
              mode === "login" ? (
                <Pressable
                  onPress={() =>
                    setError("Password reset isn’t available in the app yet.")
                  }
                >
                  <Text style={styles.forgot}>Forgot?</Text>
                </Pressable>
              ) : null
            }
            rightSlot={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name="eye" width={18} height={16} />
              </Pressable>
            }
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AppButton
            label={mode === "signup" ? "Sign up" : "Continue"}
            onPress={() => void handleContinue()}
            iconRight="arrow_right"
            disabled={busy || !identifier.trim() || !password}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <AppButton
            label="Continue as Citizen"
            variant="secondary"
            onPress={() => void handleCitizen()}
            iconLeft="citizens"
            disabled={busy}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          </Text>
          <Pressable
            onPress={() => {
              setError(null);
              setMode((m) => (m === "login" ? "signup" : "login"));
            }}
          >
            <Text style={styles.footerLink}>
              {mode === "login" ? "Sign up" : "Log in"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9F9FF",
  },
  scroll: {
    paddingHorizontal: 24,
    gap: 24,
  },
  brand: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  brandName: {
    fontFamily: fonts.Inter_600SemiBold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.brandNavy,
  },
  tagline: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    gap: 16,
  },
  forgot: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#004AC6",
  },
  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    color: colors.bodyMuted,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  footerText: {
    fontFamily: fonts.Inter_400Regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.bodyMuted,
  },
  footerLink: {
    fontFamily: fonts.Inter_500Medium,
    fontSize: 14,
    lineHeight: 20,
    color: "#004AC6",
  },
});
