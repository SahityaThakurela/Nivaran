import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import type { RootStackParamList } from "./src/navigation/types";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * Watches the auth token and resets the nav stack to Auth whenever a 401
 * clears the session mid-use ("Invalid or expired token" scenario).
 * Must live inside <NavigationContainer> to use useNavigation().
 */
function SessionGuard() {
  const { token } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const prevTokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const wasLoggedIn =
      prevTokenRef.current !== undefined && prevTokenRef.current !== null;
    const isNowLoggedOut = token === null;

    if (wasLoggedIn && isNowLoggedOut) {
      // Token was cleared mid-session — reset stack so user re-authenticates.
      navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
    }

    prevTokenRef.current = token;
  }, [token, navigation]);

  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <SessionGuard />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
