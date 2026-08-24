import * as Location from "expo-location";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

/** 0,0 is the CaptureScreen sentinel before GPS resolves. */
export function hasValidCoords(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001)
  );
}

async function reverseLabel(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    if (!place) return undefined;
    const label = [place.name, place.street, place.city, place.region]
      .filter(Boolean)
      .join(", ");
    return label || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Request permission + current GPS (falls back to last-known if current fails).
 */
export async function fetchDeviceLocation(options?: {
  accuracy?: Location.Accuracy;
  withAddress?: boolean;
}): Promise<DeviceLocation> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("permission_denied");
  }

  let latitude: number;
  let longitude: number;

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: options?.accuracy ?? Location.Accuracy.Balanced,
    });
    latitude = pos.coords.latitude;
    longitude = pos.coords.longitude;
  } catch {
    const last = await Location.getLastKnownPositionAsync();
    if (!last) throw new Error("unavailable");
    latitude = last.coords.latitude;
    longitude = last.coords.longitude;
  }

  const withAddress = options?.withAddress !== false;
  const address = withAddress
    ? (await reverseLabel(latitude, longitude)) ??
      `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    : undefined;

  return { latitude, longitude, address };
}
