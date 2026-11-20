import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { ParkZone } from '@/lib/supabase';
import {
  bearingDegrees,
  circlePolygon,
  compassLabel,
  distanceMeters,
  distanceToRingsMeters,
  pointInRings,
} from '@/lib/geo';

export type GpsStatus = 'idle' | 'locating' | 'active' | 'error';

export interface GpsFix {
  lat: number;
  lon: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GpsInsight {
  insidePark: boolean;
  distanceToPark: number;
  directionToPark: string;
  nearestZone: { name: string; distance: number } | null;
}

const ACCURACY_SOURCE = 'gps-accuracy';

function describeError(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) return 'Location access was blocked. Allow location for this site in your browser settings, then try again.';
  if (err.code === err.POSITION_UNAVAILABLE) return 'Your device could not determine its position. Make sure location services are turned on.';
  return 'No GPS signal yet. Move to an open area and try again.';
}

function ensureAccuracyLayers(map: maplibregl.Map) {
  if (map.getSource(ACCURACY_SOURCE)) return;
  map.addSource(ACCURACY_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'gps-accuracy-fill',
    type: 'fill',
    source: ACCURACY_SOURCE,
    paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.14 },
  });
  map.addLayer({
    id: 'gps-accuracy-line',
    type: 'line',
    source: ACCURACY_SOURCE,
    paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.6 },
  });
}

function setAccuracyData(map: maplibregl.Map, data: GeoJSON.FeatureCollection | GeoJSON.Feature) {
  const src = map.getSource(ACCURACY_SOURCE) as maplibregl.GeoJSONSource | undefined;
  src?.setData(data);
}

function createMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'gps-marker';
  el.innerHTML = '<div class="gps-heading"></div><div class="gps-pulse"></div><div class="gps-dot"></div>';
  return el;
}

export function useGpsTracking(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  mapReady: boolean,
  parkRings: [number, number][][],
  zones: ParkZone[],
) {
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(true);
  const watchRef = useRef<number | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const firstFixRef = useRef(true);
  const followingRef = useRef(true);
  const statusRef = useRef<GpsStatus>('idle');

  const updateStatus = (s: GpsStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const setFollow = (v: boolean) => {
    followingRef.current = v;
    setFollowing(v);
  };

  const clearWatch = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  };

  const start = useCallback(() => {
    setError(null);
    if (!window.isSecureContext) {
      updateStatus('error');
      setError('Location only works on a secure (https) page. Open the published site to use GPS.');
      return;
    }
    if (!('geolocation' in navigator)) {
      updateStatus('error');
      setError('This browser does not support location services.');
      return;
    }
    clearWatch();
    firstFixRef.current = true;
    setFollow(true);
    updateStatus('locating');

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        setFix({
          lat: latitude,
          lon: longitude,
          accuracy,
          heading: heading !== null && !Number.isNaN(heading) && (speed ?? 0) > 0.5 ? heading : null,
          speed,
          timestamp: pos.timestamp,
        });
        setError(null);
        updateStatus('active');
      },
      (err) => {
        // Once we have a fix, transient timeouts are normal while stationary; keep the last position.
        if (statusRef.current === 'active' && err.code === err.TIMEOUT) return;
        clearWatch();
        updateStatus('error');
        setError(describeError(err));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    markerRef.current?.remove();
    markerRef.current = null;
    const map = mapRef.current;
    if (map?.getSource(ACCURACY_SOURCE)) setAccuracyData(map, { type: 'FeatureCollection', features: [] });
    setFix(null);
    setError(null);
    updateStatus('idle');
  }, [mapRef]);

  const insight: GpsInsight | null = (() => {
    if (!fix) return null;
    const here: [number, number] = [fix.lon, fix.lat];
    const insidePark = pointInRings(here, parkRings);
    let nearestZone: GpsInsight['nearestZone'] = null;
    for (const z of zones) {
      const d = distanceMeters(here, [z.longitude, z.latitude]);
      if (!nearestZone || d < nearestZone.distance) nearestZone = { name: z.name, distance: d };
    }
    const ring = parkRings[0];
    const parkCenter: [number, number] = [
      ring.reduce((s, p) => s + p[0], 0) / ring.length,
      ring.reduce((s, p) => s + p[1], 0) / ring.length,
    ];
    return {
      insidePark,
      distanceToPark: insidePark ? 0 : distanceToRingsMeters(here, parkRings),
      directionToPark: compassLabel(bearingDegrees(here, parkCenter)),
      nearestZone,
    };
  })();

  const recenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || !fix) return;
    setFollow(true);
    map.flyTo({ center: [fix.lon, fix.lat], zoom: Math.max(map.getZoom(), 17), duration: 1200 });
  }, [mapRef, fix]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const onUserMove = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) setFollow(false);
    };
    map.on('dragstart', onUserMove);
    map.on('rotatestart', onUserMove);
    return () => {
      map.off('dragstart', onUserMove);
      map.off('rotatestart', onUserMove);
    };
  }, [mapRef, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !fix) return;
    const here: [number, number] = [fix.lon, fix.lat];

    ensureAccuracyLayers(map);
    setAccuracyData(map, circlePolygon(here, fix.accuracy));

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ element: createMarkerElement(), anchor: 'center', rotationAlignment: 'map' })
        .setLngLat(here)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(here);
    }
    const el = markerRef.current.getElement();
    el.classList.toggle('has-heading', fix.heading !== null);
    if (fix.heading !== null) markerRef.current.setRotation(fix.heading);

    const bounds = map.getMaxBounds();
    const withinView = !bounds || bounds.contains(here);

    if (firstFixRef.current) {
      firstFixRef.current = false;
      if (withinView) {
        map.flyTo({ center: here, zoom: 17, pitch: 50, duration: 1500 });
      } else {
        setFollow(false);
      }
    } else if (followingRef.current && withinView) {
      map.easeTo({ center: here, duration: 800 });
    }
  }, [fix, mapReady, mapRef]);

  useEffect(() => clearWatch, []);

  return { status, fix, error, insight, following, start, stop, recenter };
}
