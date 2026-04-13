"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + bundlers strip the default icon paths)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Place {
  id: string;
  city: string;
  country: string;
  entries: { id: string }[];
}

interface GeocodedPlace extends Place {
  lat: number;
  lng: number;
}

/** Simple in-memory + sessionStorage geocode cache */
const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};

async function geocode(
  city: string,
  country: string
): Promise<{ lat: number; lng: number } | null> {
  const key = `${city}__${country}`;
  if (key in geocodeCache) return geocodeCache[key];

  // Check sessionStorage
  try {
    const stored = sessionStorage.getItem(`geo:${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      geocodeCache[key] = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }

  try {
    const q = encodeURIComponent(`${city}, ${country}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
      { headers: { "User-Agent": "WanderNotes/1.0" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[key] = coords;
      try {
        sessionStorage.setItem(`geo:${key}`, JSON.stringify(coords));
      } catch {
        /* ignore */
      }
      return coords;
    }
  } catch {
    /* network error – skip marker */
  }
  geocodeCache[key] = null;
  return null;
}

export default function PlacesMap({
  places,
  onSelectPlace,
}: {
  places: Place[];
  onSelectPlace: (placeId: string) => void;
}) {
  const [geocoded, setGeocoded] = useState<GeocodedPlace[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const geocodedRef = useRef<GeocodedPlace[]>([]);
  const onSelectRef = useRef(onSelectPlace);
  onSelectRef.current = onSelectPlace;

  // Shared function to sync markers onto the current map
  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const data = geocodedRef.current;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    data.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], { icon: defaultIcon }).addTo(map);
      const popupContent = document.createElement("div");
      popupContent.className = "map-popup";

      const title = document.createElement("strong");
      title.textContent = `${place.city}, ${place.country}`;
      popupContent.appendChild(title);

      const count = document.createElement("span");
      count.className = "map-popup-count";
      count.textContent = `${place.entries.length} ${place.entries.length === 1 ? "entry" : "entries"}`;
      popupContent.appendChild(count);

      const btn = document.createElement("button");
      btn.className = "map-popup-btn";
      btn.textContent = "View Entries →";
      btn.addEventListener("click", () => onSelectRef.current(place.id));
      popupContent.appendChild(btn);
      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Fit bounds
    if (data.length > 0) {
      const bounds = L.latLngBounds(data.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    }
  }, []);

  // Geocode places
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const results: GeocodedPlace[] = [];
      for (const place of places) {
        const coords = await geocode(place.city, place.country);
        if (coords && !cancelled) {
          results.push({ ...place, ...coords });
        }
      }
      if (!cancelled) {
        geocodedRef.current = results;
        setGeocoded(results);
        syncMarkers();
      }
    }
    run();
    return () => { cancelled = true; };
  }, [places, syncMarkers]);

  // Create / destroy the Leaflet map imperatively
  const initMap = useCallback((node: HTMLDivElement | null) => {
    // Teardown previous instance if any
    if (mapRef.current) {
      try { mapRef.current.remove(); } catch { /* already gone */ }
      mapRef.current = null;
    }
    containerRef.current = node;
    if (!node) return;

    // Ensure the container has no leftover Leaflet state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (node as any)._leaflet_id;

    const map = L.map(node, {
      center: [30, 0],
      zoom: 2,
      scrollWheelZoom: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }
    ).addTo(map);

    mapRef.current = map;
    // If geocoded data is already available, add markers immediately
    syncMarkers();
  }, [syncMarkers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* already gone */ }
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="places-map-wrapper">
      <div ref={initMap} className="places-map" />
    </div>
  );
}
