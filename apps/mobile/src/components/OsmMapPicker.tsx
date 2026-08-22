import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";

export type OsmMapPickerHandle = {
  moveTo: (latitude: number, longitude: number) => void;
};

type Props = {
  latitude: number;
  longitude: number;
  onMove: (latitude: number, longitude: number) => void;
};

// RN 19 + webview typings currently resolve props as `never` in this workspace.
type WebViewRef = {
  injectJavaScript: (script: string) => void;
};
const MapWebView = WebView as unknown as React.ComponentType<Record<string, unknown>>;

function buildHtml(latitude: number, longitude: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #e8eef5; }
    .leaflet-control-attribution { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const start = { lat: ${latitude}, lng: ${longitude} };
    const map = L.map('map', { zoomControl: true }).setView([start.lat, start.lng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);

    function post(latlng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          latitude: latlng.lat,
          longitude: latlng.lng
        }));
      }
    }

    marker.on('dragend', function () {
      post(marker.getLatLng());
    });
    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      post(e.latlng);
    });

    window.setPin = function (lat, lng) {
      marker.setLatLng([lat, lng]);
      map.flyTo([lat, lng], Math.max(map.getZoom(), 17), { duration: 0.4 });
    };
  </script>
</body>
</html>`;
}

/**
 * OpenStreetMap pin picker via WebView.
 * Works in Expo Go on Android (native Google Maps often renders black there).
 */
export const OsmMapPicker = forwardRef<OsmMapPickerHandle, Props>(
  function OsmMapPicker({ latitude, longitude, onMove }, ref) {
    const webRef = useRef<WebViewRef | null>(null);
    const html = useMemo(() => buildHtml(latitude, longitude), []);

    useImperativeHandle(ref, () => ({
      moveTo(nextLat: number, nextLng: number) {
        webRef.current?.injectJavaScript(
          `window.setPin && window.setPin(${nextLat}, ${nextLng}); true;`,
        );
      },
    }));

    function onMessage(event: WebViewMessageEvent) {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          latitude?: number;
          longitude?: number;
        };
        if (
          typeof data.latitude === "number" &&
          typeof data.longitude === "number" &&
          Number.isFinite(data.latitude) &&
          Number.isFinite(data.longitude)
        ) {
          onMove(data.latitude, data.longitude);
        }
      } catch {
        // ignore malformed messages
      }
    }

    return (
      <View style={styles.wrap}>
        <MapWebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.map}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#e8eef5",
  },
  map: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
