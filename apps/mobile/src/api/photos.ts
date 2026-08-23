import { API_BASE_URL } from "./config";

type UploadPhotoResponse = {
  url: string;
  id: string;
};

/**
 * Uploads a local ImagePicker URI to the API and returns a public HTTPS URL
 * that any client can load (unlike file:// which only works on this device).
 *
 * Uses React Native's classic { uri, name, type } FormData part. This only
 * works when the global `fetch` is React Native's built-in implementation —
 * Expo SDK 56+ installs `expo/fetch` (WinterCG-compliant) as the global
 * fetch by default, which rejects this pattern with "Unsupported
 * FormDataPart implementation". EXPO_PUBLIC_USE_RN_FETCH=1 (set in .env /
 * eas.json) restores React Native's fetch as the global.
 */
export async function uploadIssuePhoto(
  token: string,
  localUri: string,
): Promise<string> {
  const name = localUri.split("/").pop() || "photo.jpg";
  const lower = name.toLowerCase();
  const type = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

  const form = new FormData();
  form.append("photo", {
    uri: localUri,
    name,
    type,
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/issues/photos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Photo upload failed (${response.status})`;
    throw new Error(message);
  }

  const url = (payload as UploadPhotoResponse | null)?.url;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("Photo upload did not return a public URL");
  }
  return url;
}
