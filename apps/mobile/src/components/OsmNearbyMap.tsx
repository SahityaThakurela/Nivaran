import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import type { ReportCategory } from "../api/types";

export type NearbyMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  category: ReportCategory | null;
  photoUrl?: string | null;
};

type Props = {
  markers: NearbyMapMarker[];
  selectedId: string | null;
  userLocation: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
  onOpenIssue: (id: string) => void;
  onTouchMap?: (active: boolean) => void;
};

type WebViewRef = {
  injectJavaScript: (script: string) => void;
};

const MapWebView = WebView as unknown as React.ComponentType<Record<string, unknown>>;

function toPayload(
  markers: NearbyMapMarker[],
  selectedId: string | null,
  userLocation: { lat: number; lng: number } | null,
) {
  return {
    markers: markers.map((m) => ({
      id: m.id,
      lat: m.latitude,
      lng: m.longitude,
    })),
    selectedId,
    user: userLocation,
  };
}

function buildHtml(
  markers: NearbyMapMarker[],
  selectedId: string | null,
  userLocation: { lat: number; lng: number } | null,
): string {
  const payload = JSON.stringify(toPayload(markers, selectedId, userLocation));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #e8eef5; touch-action: pan-x pan-y pinch-zoom; }
    .leaflet-control-attribution { font-size: 9px; }
    .leaflet-container { background: #e8eef5; }
    .pin-img { display: block; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(18,27,46,0.35)); }
    .user-dot {
      width: 14px; height: 14px; border-radius: 7px;
      background: #2563EB; border: 2.5px solid #fff;
      box-shadow: 0 0 0 5px rgba(37,99,235,0.22);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const data = ${payload};
    let didFit = false;
    const markerObjs = {};

    // Classic red map pin (matches provided marker art).
    const PIN_SVG = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 72">' +
      '<path fill="#EA4335" d="M24 0C10.745 0 0 10.745 0 24c0 18 24 48 24 48s24-30 24-48C48 10.745 37.255 0 24 0z"/>' +
      '<circle cx="24" cy="24" r="10" fill="#8B1A14"/>' +
      '</svg>'
    );
    const PIN_SELECTED_SVG = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 72">' +
      '<path fill="#004AC6" d="M24 0C10.745 0 0 10.745 0 24c0 18 24 48 24 48s24-30 24-48C48 10.745 37.255 0 24 0z"/>' +
      '<circle cx="24" cy="24" r="10" fill="#121B2E"/>' +
      '</svg>'
    );

    function pinSizeForZoom(zoom, selected) {
      // Shrink as user zooms out so markers don't clutter.
      var base;
      if (zoom >= 17) base = 40;
      else if (zoom >= 16) base = 34;
      else if (zoom >= 15) base = 28;
      else if (zoom >= 14) base = 22;
      else if (zoom >= 13) base = 16;
      else base = 12;
      if (selected) base = Math.round(base * 1.2);
      return { w: base, h: Math.round(base * 1.5) };
    }

    function iconFor(selected, zoom) {
      var size = pinSizeForZoom(zoom, selected);
      var src = selected ? PIN_SELECTED_SVG : PIN_SVG;
      return L.divIcon({
        className: '',
        html: '<img class="pin-img" width="' + size.w + '" height="' + size.h +
          '" src="data:image/svg+xml,' + src + '" alt="" />',
        iconSize: [size.w, size.h],
        iconAnchor: [size.w / 2, size.h],
        popupAnchor: [0, -size.h + 4]
      });
    }

    const map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      dragging: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    let userLayer = null;

    function haversine(a, b) {
      var R = 6371000;
      var toRad = function (d) { return d * Math.PI / 180; };
      var dLat = toRad(b.lat - a.lat);
      var dLng = toRad(b.lng - a.lng);
      var x =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(x));
    }

    function fitDefaultView() {
      if (didFit) return;
      var origin = data.user || (data.markers[0] ? { lat: data.markers[0].lat, lng: data.markers[0].lng } : null);
      if (!origin) {
        map.setView([28.5355, 77.391], 15);
        didFit = true;
        return;
      }

      // Prefer closest 2–3 issues so default zoom feels useful, not cluttered.
      var sorted = data.markers.slice().sort(function (a, b) {
        return haversine(origin, a) - haversine(origin, b);
      });
      var focus = sorted.slice(0, Math.min(3, sorted.length));
      var bounds = focus.map(function (m) { return [m.lat, m.lng]; });
      bounds.push([origin.lat, origin.lng]);

      if (focus.length === 0) {
        map.setView([origin.lat, origin.lng], 15);
      } else if (focus.length === 1) {
        map.setView([focus[0].lat, focus[0].lng], 16);
      } else {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
      }
      didFit = true;
    }

    function renderMarkers() {
      var zoom = map.getZoom() || 15;
      Object.keys(markerObjs).forEach(function (id) {
        layer.removeLayer(markerObjs[id]);
      });
      Object.keys(markerObjs).forEach(function (id) { delete markerObjs[id]; });

      data.markers.forEach(function (m) {
        var selected = m.id === data.selectedId;
        var marker = L.marker([m.lat, m.lng], {
          icon: iconFor(selected, zoom),
          zIndexOffset: selected ? 1000 : 0
        });
        marker.on('click', function (e) {
          L.DomEvent.stopPropagation(e);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open', id: m.id }));
          }
        });
        marker.addTo(layer);
        markerObjs[m.id] = marker;
      });

      if (userLayer) {
        layer.removeLayer(userLayer);
        userLayer = null;
      }
      if (data.user) {
        userLayer = L.marker([data.user.lat, data.user.lng], {
          icon: L.divIcon({
            className: '',
            html: '<div class="user-dot"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          }),
          zIndexOffset: 400,
          interactive: false
        }).addTo(layer);
      }
    }

    map.on('zoomend', function () {
      renderMarkers();
    });

    renderMarkers();
    fitDefaultView();

    window.updateNearby = function (next) {
      var prevCount = data.markers.length;
      data.markers = next.markers || data.markers;
      data.selectedId = next.selectedId;
      data.user = next.user !== undefined ? next.user : data.user;
      renderMarkers();
      // Only auto-fit once when markers first arrive.
      if (!didFit || (prevCount === 0 && data.markers.length > 0)) {
        if (prevCount === 0 && data.markers.length > 0) didFit = false;
        fitDefaultView();
      }
    };
  </script>
</body>
</html>`;
}

/**
 * Nearby issues map — red pin markers that shrink on zoom-out.
 */
export function OsmNearbyMap({
  markers,
  selectedId,
  userLocation,
  onSelect,
  onOpenIssue,
  onTouchMap,
}: Props) {
  const webRef = useRef<WebViewRef | null>(null);
  const readyRef = useRef(false);
  const html = useMemo(
    () => buildHtml(markers, selectedId, userLocation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!readyRef.current) return;
    const payload = toPayload(markers, selectedId, userLocation);
    webRef.current?.injectJavaScript(
      `window.updateNearby && window.updateNearby(${JSON.stringify(payload)}); true;`,
    );
  }, [markers, selectedId, userLocation]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
      };
      if (typeof data.id !== "string") return;
      if (data.type === "open") {
        onSelect(data.id);
        onOpenIssue(data.id);
      } else if (data.type === "select") {
        onSelect(data.id);
      }
    } catch {
      // ignore
    }
  }

  return (
    <View
      style={styles.wrap}
      onTouchStart={() => onTouchMap?.(true)}
      onTouchEnd={() => onTouchMap?.(false)}
      onTouchCancel={() => onTouchMap?.(false)}
    >
      <MapWebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.map}
        onMessage={onMessage}
        onLoadEnd={() => {
          readyRef.current = true;
          const payload = toPayload(markers, selectedId, userLocation);
          webRef.current?.injectJavaScript(
            `window.updateNearby && window.updateNearby(${JSON.stringify(payload)}); true;`,
          );
        }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        scrollEnabled
        nestedScrollEnabled
        scalesPageToFit={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#e8eef5",
  },
  map: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
