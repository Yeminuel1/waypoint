import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Simple in-memory cache so repeated views of the same shipment (or the
// same origin/destination city reused across shipments) don't re-hit the
// geocoding service every time.
const geocodeCache = new Map();

// Free geocoding via OpenStreetMap's Nominatim — no API key needed. Meant
// for light/demo use; a production app with real traffic should use a paid
// geocoding provider with its own rate limits instead.
async function geocode(placeName) {
  if (geocodeCache.has(placeName)) return geocodeCache.get(placeName);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    if (!data[0]) {
      geocodeCache.set(placeName, null);
      return null;
    }
    const point = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(placeName, point);
    return point;
  } catch (e) {
    return null;
  }
}

function dot(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #0A0A0A;box-shadow:0 0 0 2px ${color}55;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Recenters/fits the map whenever the set of points changes, since
// MapContainer only reads its bounds on first mount otherwise.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(points, { padding: [28, 28] });
  }, [points, map]);
  return null;
}

// Shows origin, destination, and an interpolated "current position" marker
// along the straight line between them, based on how far through the
// stages the shipment currently is. This is illustrative (a straight line,
// not a real route), which is enough to give a visual sense of progress.
export default function ShipmentMap({ origin, dest, progress }) {
  const [originPt, setOriginPt] = useState(null);
  const [destPt, setDestPt] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOriginPt(null);
    setDestPt(null);
    setFailed(false);
    Promise.all([geocode(origin), geocode(dest)]).then(([o, d]) => {
      if (cancelled) return;
      if (!o || !d) {
        setFailed(true);
        return;
      }
      setOriginPt(o);
      setDestPt(d);
    });
    return () => {
      cancelled = true;
    };
  }, [origin, dest]);

  const currentPt = useMemo(() => {
    if (!originPt || !destPt) return null;
    return {
      lat: originPt.lat + (destPt.lat - originPt.lat) * progress,
      lng: originPt.lng + (destPt.lng - originPt.lng) * progress,
    };
  }, [originPt, destPt, progress]);

  if (failed) return null; // silently omit the map if we can't place these locations
  if (!originPt || !destPt || !currentPt) {
    return (
      <div
        className="mt-4 rounded-lg flex items-center justify-center text-xs"
        style={{ height: 180, background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#6B6B6B" }}
      >
        Loading map…
      </div>
    );
  }

  const points = [
    [originPt.lat, originPt.lng],
    [destPt.lat, destPt.lng],
  ];

  return (
    <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid #2A2A2A", height: 180 }}>
      <MapContainer
        center={[currentPt.lat, currentPt.lng]}
        zoom={4}
        style={{ height: "100%", width: "100%", background: "#141414" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds points={points} />
        <Polyline positions={points} pathOptions={{ color: "#6B6B6B", weight: 2, dashArray: "4 6" }} />
        <Marker position={[originPt.lat, originPt.lng]} icon={dot("#A3A3A3")}>
          <Popup>{origin}</Popup>
        </Marker>
        <Marker position={[destPt.lat, destPt.lng]} icon={dot("#A3A3A3")}>
          <Popup>{dest}</Popup>
        </Marker>
        <Marker position={[currentPt.lat, currentPt.lng]} icon={dot("#E11D2E")} />
      </MapContainer>
    </div>
  );
}
