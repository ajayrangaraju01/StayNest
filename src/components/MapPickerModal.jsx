import { useEffect, useRef, useState } from "react";
import { geocodeAddress, loadGoogleMapsApi, reverseGeocodeLatLng } from "../utils/googleMaps";

export default function MapPickerModal({
  isOpen,
  title = "Pick Location",
  initialLat,
  initialLng,
  initialQuery = "",
  onClose,
  onPick,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchBusy, setSearchBusy] = useState(false);
  const [pickedPoint, setPickedPoint] = useState(() => (
    initialLat != null && initialLng != null
      ? { lat: Number(initialLat), lng: Number(initialLng) }
      : null
  ));

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    const initMap = async () => {
      try {
        const google = await loadGoogleMapsApi();
        if (cancelled || !mapRef.current) return;
        const defaultCenter = pickedPoint || { lat: 17.385044, lng: 78.486671 };
        const map = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: pickedPoint ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapInstanceRef.current = map;

        const marker = new google.maps.Marker({
          position: defaultCenter,
          map,
          draggable: true,
          visible: Boolean(pickedPoint),
        });
        markerRef.current = marker;

        const updatePickedPoint = (latLng) => {
          const nextPoint = {
            lat: Number(latLng.lat()),
            lng: Number(latLng.lng()),
          };
          setPickedPoint(nextPoint);
          marker.setPosition(nextPoint);
          marker.setVisible(true);
        };

        map.addListener("click", (event) => {
          if (!event.latLng) return;
          updatePickedPoint(event.latLng);
        });

        marker.addListener("dragend", (event) => {
          if (!event.latLng) return;
          updatePickedPoint(event.latLng);
        });
      } catch {
        // parent handles missing API key via later action feedback
      }
    };

    initMap();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setPickedPoint(
      initialLat != null && initialLng != null
        ? { lat: Number(initialLat), lng: Number(initialLng) }
        : null,
    );
    setSearchQuery(initialQuery || "");
  }, [initialLat, initialLng, initialQuery, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!pickedPoint) return;
    setBusy(true);
    try {
      const location = await reverseGeocodeLatLng(pickedPoint.lat, pickedPoint.lng);
      onPick(location);
    } catch {
      onPick({
        formattedAddress: "",
        lat: pickedPoint.lat,
        lng: pickedPoint.lng,
        area: "",
        city: "",
        pincode: "",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSearchArea = async () => {
    if (!searchQuery.trim()) return;
    setSearchBusy(true);
    try {
      const location = await geocodeAddress(searchQuery);
      const nextPoint = { lat: Number(location.lat), lng: Number(location.lng) };
      setPickedPoint(nextPoint);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(nextPoint);
        mapInstanceRef.current.setZoom(16);
      }
      if (markerRef.current) {
        markerRef.current.setPosition(nextPoint);
        markerRef.current.setVisible(true);
      }
    } finally {
      setSearchBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          background: "white",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 28px 60px rgba(15, 23, 42, 0.28)",
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--cream-dark)" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: "var(--warm-gray)", marginTop: 4 }}>
            Search an area to center the map, then click or drag the pin to the exact hostel building.
          </div>
        </div>
        <div style={{ padding: 16, borderBottom: "1px solid var(--cream-dark)", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="form-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search area or landmark to center map"
            style={{ flex: 1, minWidth: 220 }}
          />
          <button type="button" className="nav-btn" onClick={handleSearchArea} disabled={searchBusy}>
            {searchBusy ? "Searching..." : "Search Area"}
          </button>
        </div>
        <div ref={mapRef} style={{ width: "100%", height: 420, background: "var(--cream-dark)" }} />
        <div
          style={{
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--warm-gray)" }}>
            {pickedPoint
              ? `Selected: ${pickedPoint.lat.toFixed(6)}, ${pickedPoint.lng.toFixed(6)}`
              : "Pick a point on the map to continue."}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="back-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="book-now-btn"
              onClick={handleConfirm}
              disabled={!pickedPoint || busy}
            >
              {busy ? "Saving..." : "Use This Location"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
