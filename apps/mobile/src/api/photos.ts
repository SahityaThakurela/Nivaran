import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import { API_BASE_URL } from "./config";

type UploadPhotoResponse = {
  url: string;
  id: string;
};

/**
 * Uploads a local ImagePicker URI to the API and returns a public HTTPS URL
 * that any client can load (unlike file:// which only works on this device).
 */
export async function uploadIssuePhoto(
  token: string,
  localUri: string,
): Promise<string> {
  const form = new FormData();
  form.append("photo", new File(localUri));

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
