import { Platform } from "react-native";

/**
 * API base URL for the Express backend at apps/api.
 * Override with EXPO_PUBLIC_API_URL when testing on a physical device.
 */
const fallbackHost =
  Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  `http://${fallbackHost}:4000`;
