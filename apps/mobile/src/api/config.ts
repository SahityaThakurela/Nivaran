import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * API base URL for the Express backend at apps/api.
 *
 * On a physical phone, 127.0.0.1 is the phone itself — not your Mac.
 * We prefer the Metro/Expo host (same LAN IP shown in the Expo QR URL).
 * Override with EXPO_PUBLIC_API_URL only for non-loopback hosts
 * (e.g. a deployed API).
 */
function metroLanHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    // Expo Go / older manifests
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (
      Constants as {
        manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
      }
    ).manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const host = value.split(":")[0]?.trim();
    if (host && host !== "127.0.0.1" && host !== "localhost") {
      return host;
    }
  }
  return null;
}

function isLoopbackUrl(url: string): boolean {
  return /:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/i.test(url);
}

const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const fallbackHost =
  metroLanHost() ?? (Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1");

export const API_BASE_URL =
  envUrl && !isLoopbackUrl(envUrl) ? envUrl : `http://${fallbackHost}:4000`;
