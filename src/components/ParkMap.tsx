import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { ParkZone, Pond, PondWithLatest } from '@/lib/supabase';
import { STATUS_CONFIG, POND_TYPE_CONFIG } from '@/lib/types';
import { Layers } from 'lucide-react';
import { useGpsTracking } from '@/lib/use-gps-tracking';
import GpsControl from '@/components/GpsControl';
import MapOverlayPanel from '@/components/MapOverlayPanel';

// Bundling renames maplibre's chunk, so its default sibling-file worker lookup 404s in production.
maplibregl.setWorkerUrl(maplibreWorkerUrl);

// Real OSM boundary for Nyandungu Eco-Park (relation 14458649)
// Three outer rings forming the park footprint
const PARK_RINGS: [number, number][][] = [
  // Ring 1 — western lobe
  [
    [-1.9560875, 30.1336181], [-1.9553507, 30.1350124], [-1.9548311, 30.136179],
    [-1.9544293, 30.1370266], [-1.9539796, 30.1382784], [-1.9539141, 30.1387764],
    [-1.953745, 30.1390409], [-1.9521019, 30.1395404], [-1.9510465, 30.139825],
    [-1.9501125, 30.1393737], [-1.9501673, 30.1382298], [-1.9517131, 30.1384037],
    [-1.9526277, 30.1376075], [-1.9536653, 30.1363354], [-1.9538482, 30.1347248],
    [-1.9546165, 30.1329128], [-1.9560875, 30.1336181],
  ],
  // Ring 2 — main central body
  [
    [-1.9508701, 30.1400204], [-1.9510933, 30.1406], [-1.9516183, 30.1421456],
    [-1.9516183, 30.1424203], [-1.9514916, 30.142695], [-1.9515339, 30.1434346],
    [-1.9511054, 30.1441811], [-1.9508791, 30.144812], [-1.9510059, 30.1451864],
    [-1.9514494, 30.1450837], [-1.9512412, 30.1456966], [-1.9505382, 30.1462551],
    [-1.951033, 30.146883], [-1.95138, 30.147203], [-1.9518024, 30.1475562],
    [-1.9519593, 30.1477675], [-1.9520588, 30.1479499], [-1.952439, 30.1483423],
    [-1.953698, 30.1491242], [-1.9545489, 30.149568], [-1.9553002, 30.1500087],
    [-1.9562324, 30.1513763], [-1.9567544, 30.1523393], [-1.9571505, 30.1530441],
    [-1.957316, 30.1530492], [-1.9574364, 30.1529588], [-1.9575117, 30.1529086],
    [-1.9573913, 30.1524344], [-1.9574214, 30.1520203], [-1.9575894, 30.151674],
    [-1.9578744, 30.1514256], [-1.9580951, 30.151285], [-1.9581804, 30.1511019],
    [-1.9581553, 30.1508961], [-1.9580023, 30.1506], [-1.9578267, 30.1501232],
    [-1.9576512, 30.1495867], [-1.9573327, 30.1487264], [-1.9571245, 30.1481052],
    [-1.9568812, 30.1473956], [-1.9564543, 30.146268], [-1.956038, 30.145143],
    [-1.9559277, 30.1448143], [-1.955454, 30.1435387], [-1.9547769, 30.1417014],
    [-1.9543681, 30.1405941], [-1.9541675, 30.1400024], [-1.9539969, 30.1393053],
    [-1.9539768, 30.1391948], [-1.9539242, 30.1391547], [-1.9538188, 30.1391572],
    [-1.9535856, 30.1392325], [-1.9520923, 30.1396541], [-1.9510309, 30.1399577],
    [-1.9508701, 30.1400204],
  ],
  // Ring 3 — eastern lobe
  [
    [-1.958527, 30.1515376], [-1.9583722, 30.1514386], [-1.9581873, 30.1514601],
    [-1.9577702, 30.1517441], [-1.9576209, 30.1519504], [-1.957553, 30.1522151],
    [-1.9575959, 30.1526514], [-1.9579748, 30.1540262], [-1.9590474, 30.15758],
    [-1.9593584, 30.158588], [-1.9597479, 30.1584557], [-1.9599767, 30.1594739],
    [-1.9598087, 30.160157], [-1.9592797, 30.1608687], [-1.9602784, 30.1613575],
    [-1.960424, 30.1613575], [-1.9609172, 30.161913], [-1.9634714, 30.1636306],
    [-1.9635074, 30.1637117], [-1.9640028, 30.1635135], [-1.9661536, 30.1622457],
    [-1.9631698, 30.1576684], [-1.9621921, 30.1558973], [-1.9615455, 30.1550795],
    [-1.9599565, 30.1532006], [-1.9590522, 30.1521085], [-1.958527, 30.1515376],
  ],
];

// Convert lat/lon rings to GeoJSON polygon
const PARK_RINGS_LONLAT: [number, number][][] = PARK_RINGS.map((ring) => ring.map(([lat, lon]) => [lon, lat]));

function ringsToGeoJSON(rings: [number, number][][]): GeoJSON.FeatureCollection {
  const polygons = rings.map((ring) => ring.map(([lat, lon]) => [lon, lat]));
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: 'Nyandungu Eco-Park' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: polygons.map((p) => [p]),
      },
    }],
  };
}

// Walking/cycling paths through the park
const PARK_PATHS: [number, number][] = [
  [-1.9510, 30.1385], [-1.9520, 30.1400], [-1.9530, 30.1420], [-1.9540, 30.1440],
  [-1.9550, 30.1460], [-1.9560, 30.1480], [-1.9570, 30.1500], [-1.9580, 30.1520],
  [-1.9590, 30.1540], [-1.9600, 30.1560], [-1.9610, 30.1580], [-1.9620, 30.1600],
];

// Infrastructure points
const INFRA_POINTS = [
  { name: 'Information Centre', lat: -1.9520, lon: 30.1405, type: 'info' },
  { name: 'Restaurant', lat: -1.9555, lon: 30.1485, type: 'restaurant' },
  { name: 'Parking', lat: -1.9515, lon: 30.1395, type: 'parking' },
  { name: "Pope's Garden", lat: -1.9535, lon: 30.1440, type: 'garden' },
  { name: 'Medicinal Garden', lat: -1.9540, lon: 30.1420, type: 'garden' },
];

const zoneTypeColors: Record<string, string> = {
  savannah: '#d97706',
  woodland: '#059669',
  garden: '#db2777',
  wetland: '#0d9488',
  recreational: '#2563eb',
};

const statusColors: Record<string, string> = {
  healthy: '#10b981',
  moderate: '#f59e0b',
  degraded: '#f97316',
  critical: '#ef4444',
};

interface ParkMapProps {
  zones: ParkZone[];
  ponds: (Pond | PondWithLatest)[];
  onSelectZone?: (zone: ParkZone) => void;
  selectedZoneId?: string | null;
  height?: string;
  showPonds?: boolean;
  showLegend?: boolean;
  showGps?: boolean;
  variant?: 'embedded' | 'fullpage';
}

export default function ParkMap({
  zones,
  ponds,
  onSelectZone,
  selectedZoneId,
  height = '500px',
  showPonds = true,
  showLegend = true,
  showGps = true,
  variant = 'embedded',
}: ParkMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const mapLoadedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const gps = useGpsTracking(mapRef, mapReady, PARK_RINGS_LONLAT, zones);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '&copy; Esri, Maxar, Earthstar Geographics',
            maxzoom: 19,
          },
          'labels-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '',
            maxzoom: 19,
          },
          'terrain-dem': {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
            ],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15,
          },
        },
        layers: [
          { id: 'satellite', type: 'raster', source: 'satellite-tiles' },
          {
            id: 'labels',
            type: 'raster',
            source: 'labels-tiles',
            paint: { 'raster-opacity': 0.6 },
          },
        ],
        sky: {
          'sky-color': '#d4e8f0',
          'sky-horizon-blend': 0.5,
          'horizon-color': '#b0c8d0',
          'horizon-fog-blend': 0.3,
        },
        terrain: {
          source: 'terrain-dem',
          exaggeration: 1.5,
        },
      } as any,
      center: [30.1453163, -1.9555621],
      zoom: 14,
      pitch: 55,
      bearing: -20,
      maxZoom: 18,
      minZoom: 13.5,
      maxBounds: [[30.118, -1.978], [30.178, -1.938]],
      maxPitch: 80,
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }),
      'bottom-right'
    );
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      mapLoadedRef.current = true;
      setMapReady(true);

      // Park boundary
      map.addSource('park-boundary', {
        type: 'geojson',
        data: ringsToGeoJSON(PARK_RINGS),
      });
      map.addLayer({
        id: 'park-fill',
        type: 'fill',
        source: 'park-boundary',
        paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.08 },
      });
      map.addLayer({
        id: 'park-outline',
        type: 'line',
        source: 'park-boundary',
        paint: {
          'line-color': '#0d9488',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.8,
        },
      });

      // Walking/cycling path
      const pathGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { type: 'path' },
          geometry: {
            type: 'LineString',
            coordinates: PARK_PATHS.map(([lat, lon]) => [lon, lat]),
          },
        }],
      };
      map.addSource('park-paths', { type: 'geojson', data: pathGeoJSON });
      map.addLayer({
        id: 'path-casing',
        type: 'line',
        source: 'park-paths',
        paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.5 },
      });
      map.addLayer({
        id: 'path-line',
        type: 'line',
        source: 'park-paths',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.5,
          'line-dasharray': [2, 1],
          'line-opacity': 0.9,
        },
      });

      // Empty zones source — will be updated by the data effect
      map.addSource('zones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'zone-fill',
        type: 'fill',
        source: 'zones',
        paint: { 'fill-color': ['get', 'typeColor'], 'fill-opacity': 0.3 },
      });
      map.addLayer({
        id: 'zone-outline',
        type: 'line',
        source: 'zones',
        paint: { 'line-color': ['get', 'typeColor'], 'line-width': 2, 'line-opacity': 0.8 },
      });
      map.addLayer({
        id: 'zone-labels',
        type: 'symbol',
        source: 'zones',
        layout: {
          'text-field': ['get', 'zoneName'],
          'text-size': 11,
          'text-anchor': 'center',
          'text-offset': [0, -1.5],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0f172a',
          'text-halo-width': 2,
        },
      });

      map.on('click', 'zone-fill', (e: any) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        const zone = zones.find((z) => z.id === props.zoneId);
        if (zone && onSelectZone) onSelectZone(zone);
      });
      map.on('mouseenter', 'zone-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'zone-fill', () => { map.getCanvas().style.cursor = ''; });

      // Infrastructure markers (static, only once)
      INFRA_POINTS.forEach((infra) => {
        const el = document.createElement('div');
        el.className = 'infra-marker-3d';
        const icons: Record<string, string> = {
          info: 'i', restaurant: 'R', parking: 'P', garden: 'G',
        };
        el.innerHTML = `<div class="infra-dot-3d">${icons[infra.type] || 'i'}</div>`;
        const popup = new maplibregl.Popup({
          offset: 15, closeButton: false, className: 'nyandungu-popup',
        }).setHTML(`
          <div style="min-width:120px;padding:2px;">
            <div style="font-size:12px;font-weight:600;color:#0f172a;">${infra.name}</div>
          </div>
        `);
        const m = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([infra.lon, infra.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(m);
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      markersRef.current = [];
    };
  }, []);

  // Update zones and ponds markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    // Remove old dynamic markers (keep infra markers by removing only zone + pond markers)
    markersRef.current = markersRef.current.filter((m) => {
      const el = m.getElement();
      if (el.classList.contains('zone-marker-3d') || el.classList.contains('pond-marker-3d')) {
        m.remove();
        return false;
      }
      return true;
    });

    // Update zone GeoJSON source
    const zoneFeatures: GeoJSON.Feature[] = zones.map((zone) => {
      const typeColor = zoneTypeColors[zone.zone_type] || '#10b981';
      const statusColor = statusColors[zone.ecological_status] || '#10b981';
      const lat = zone.latitude;
      const lon = zone.longitude;
      const size = 0.0025;
      return {
        type: 'Feature',
        properties: {
          zoneId: zone.id,
          zoneName: zone.name,
          typeColor,
          statusColor,
          status: zone.ecological_status,
          zoneType: zone.zone_type,
          area: zone.area_hectares,
          description: zone.description,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lon - size, lat - size],
            [lon + size, lat - size],
            [lon + size, lat + size],
            [lon - size, lat + size],
            [lon - size, lat - size],
          ]],
        },
      };
    });

    const zonesSource = map.getSource('zones') as maplibregl.GeoJSONSource;
    if (zonesSource) {
      zonesSource.setData({ type: 'FeatureCollection', features: zoneFeatures });
    }

    // Add zone markers
    zones.forEach((zone) => {
      const statusColor = statusColors[zone.ecological_status] || '#10b981';
      const el = document.createElement('div');
      el.className = 'zone-marker-3d';
      el.innerHTML = `
        <div class="zone-pin-3d" style="background:${statusColor};">
          <div class="zone-pulse-3d" style="background:${statusColor};"></div>
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 20, closeButton: false, className: 'nyandungu-popup',
      }).setHTML(`
        <div style="min-width:220px;padding:4px 2px;">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">${zone.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor};"></span>
            <span style="font-size:11px;color:#475569;">${STATUS_CONFIG[zone.ecological_status].label} &middot; ${zone.area_hectares} ha</span>
          </div>
          <div style="font-size:11px;color:#64748b;margin-bottom:8px;line-height:1.4;">${zone.description.substring(0, 100)}...</div>
          ${onSelectZone ? `<button id="zone-link-3d-${zone.id}" style="width:100%;padding:6px 12px;background:#0d9488;color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;">View Zone Details</button>` : ''}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([zone.longitude, zone.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);

      if (onSelectZone) {
        el.addEventListener('click', () => onSelectZone(zone));
      }
      popup.on('open', () => {
        const btn = document.getElementById(`zone-link-3d-${zone.id}`);
        if (btn && onSelectZone) btn.onclick = () => onSelectZone(zone);
      });
    });

    // Add pond markers
    if (showPonds) {
      ponds.forEach((pond) => {
        const el = document.createElement('div');
        el.className = 'pond-marker-3d';
        const typeCfg = POND_TYPE_CONFIG[pond.pond_type];
        const shortName = pond.name.replace(/^Pond \d+ - /, '');
        el.innerHTML = `
          <div class="pond-dot-3d">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z"/>
            </svg>
          </div>
          <div class="pond-label-3d">${shortName}</div>
        `;

        const popup = new maplibregl.Popup({
          offset: 15, closeButton: false, className: 'nyandungu-popup',
        }).setHTML(`
          <div style="min-width:180px;padding:4px 2px;">
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px;">${pond.name}</div>
            <div style="font-size:11px;color:#64748b;">${typeCfg.label} &middot; ${pond.surface_area_m2.toLocaleString()} m&sup2;</div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([pond.longitude, pond.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [zones, ponds, showPonds, onSelectZone, mapReady]);

  // Fly to selected zone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZoneId) return;
    const zone = zones.find((z) => z.id === selectedZoneId);
    if (zone) {
      map.flyTo({
        center: [zone.longitude, zone.latitude],
        zoom: 16,
        pitch: 60,
        bearing: map.getBearing(),
        duration: 1500,
      });
    }
  }, [selectedZoneId, zones]);

  return (
    <>
      <style>{`
        .zone-marker-3d { cursor: pointer; }
        .zone-pin-3d {
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.4);
          position: relative; z-index: 2;
        }
        .zone-pulse-3d {
          position: absolute; top: 50%; left: 50%;
          width: 16px; height: 16px; border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0; animation: zonePulse3d 2.5s ease-out infinite; z-index: 1;
        }
        @keyframes zonePulse3d {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
        .pond-marker-3d { cursor: pointer; }
        .pond-dot-3d {
          width: 24px; height: 24px;
          color: #38bdf8;
          background: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        }
        .pond-marker-3d:hover .pond-dot-3d { transform: scale(1.2); }
        .pond-label-3d {
          position: absolute;
          top: 100%; left: 50%;
          transform: translateX(-50%);
          margin-top: 4px;
          background: rgba(15,23,42,0.82);
          color: white;
          font-size: 10px; font-weight: 600;
          white-space: nowrap;
          padding: 2px 7px;
          border-radius: 5px;
          pointer-events: none;
          backdrop-filter: blur(4px);
          line-height: 1.3;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .infra-marker-3d { cursor: pointer; }
        .infra-dot-3d {
          width: 22px; height: 22px;
          background: #1e293b;
          color: white;
          border-radius: 6px;
          font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          border: 2px solid white;
          transition: transform 0.2s;
        }
        .infra-marker-3d:hover .infra-dot-3d { transform: scale(1.15); }
        .nyandungu-popup .maplibregl-popup-content {
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }
        .nyandungu-popup .maplibregl-popup-tip {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .maplibregl-ctrl-scale {
          font-size: 10px;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(6px);
          border-radius: 6px;
          padding: 2px 6px;
          color: #475569;
          border: 1px solid rgba(0,0,0,0.08);
        }
        .maplibregl-ctrl-group {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12) !important;
          border-radius: 10px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          width: 34px !important;
          height: 34px !important;
          transition: all 0.15s ease;
        }
        .maplibregl-ctrl-group button:hover { background: #f8fafc; }
        .maplibregl-ctrl-attrib {
          background: rgba(255,255,255,0.7) !important;
          backdrop-filter: blur(8px);
          border-radius: 8px 0 0 0;
          padding: 3px 8px !important;
          font-size: 10px !important;
          color: #94a3b8 !important;
        }
        .maplibregl-ctrl-attrib a { color: #0d9488 !important; }
        @keyframes mapPanelIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        .gps-marker { position: relative; width: 22px; height: 22px; pointer-events: none; }
        .gps-dot {
          position: absolute; inset: 3px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid white;
          box-shadow: 0 1px 6px rgba(0,0,0,0.35);
        }
        .gps-pulse {
          position: absolute; inset: 0;
          border-radius: 50%;
          background: rgba(37,99,235,0.35);
          animation: gpsRing 2s ease-out infinite;
        }
        .gps-heading {
          display: none;
          position: absolute; left: 50%; bottom: 50%;
          width: 0; height: 0;
          transform: translateX(-50%);
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 26px solid rgba(37,99,235,0.45);
          transform-origin: 50% 100%;
        }
        .gps-marker.has-heading .gps-heading { display: block; }
        @keyframes gpsRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .gps-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px; font-weight: 600;
          transition: all 0.2s ease;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
          backdrop-filter: blur(8px);
        }
        .gps-btn-idle, .gps-btn-locating {
          background: rgba(255,255,255,0.92); color: #1e40af;
          border: 1px solid rgba(255,255,255,0.6);
        }
        .gps-btn-idle:hover { background: white; transform: translateY(-1px); }
        .gps-btn-active {
          background: rgba(37,99,235,0.92); color: white;
          border: 1px solid rgba(37,99,235,0.6);
        }
        .gps-btn-active:hover { background: rgba(29,78,216,0.95); }
        .gps-btn-error {
          background: rgba(239,68,68,0.92); color: white;
          border: 1px solid rgba(239,68,68,0.6);
        }
        .gps-btn-error:hover { background: rgba(220,38,38,0.95); }
      `}</style>
      <div className="relative w-full" style={{ height }}>
        <div
          ref={containerRef}
          style={{ height: '100%', width: '100%' }}
          className={variant === 'fullpage' ? 'absolute inset-0' : 'rounded-2xl overflow-hidden'}
        />
        {showGps && (
          <GpsControl
            status={gps.status}
            fix={gps.fix}
            error={gps.error}
            insight={gps.insight}
            following={gps.following}
            onStart={gps.start}
            onStop={gps.stop}
            onRecenter={gps.recenter}
            position={variant === 'fullpage' ? 'bottom-5 right-20' : 'bottom-8 right-14'}
          />
        )}
        {showLegend && (
          <MapOverlayPanel
            title="Legend"
            subtitle="Ecological status"
            icon={Layers}
            position={variant === 'fullpage' ? 'top-5 left-5' : 'top-3 left-3'}
            widthClass="w-52"
            maxHeightClass="max-h-[70%]"
          >
            <div className="px-3.5 py-3 space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.hex }} />
                  <span className="text-xs text-slate-700 font-medium">{cfg.label}</span>
                </div>
              ))}
              <div className="border-t border-slate-200/60 pt-2 mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-400 border-2 border-white shadow-sm" />
                  <span className="text-xs text-slate-700 font-medium">Monitored Pond</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0 border-t-2 border-dashed border-teal-600" />
                  <span className="text-xs text-slate-700 font-medium">Park Boundary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0 border-t-2 border-dashed border-amber-500" />
                  <span className="text-xs text-slate-700 font-medium">Walking / Cycling Path</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-800 border border-white" />
                  <span className="text-xs text-slate-700 font-medium">Infrastructure</span>
                </div>
                {showGps && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm" />
                    <span className="text-xs text-slate-700 font-medium">Your Location (GPS)</span>
                  </div>
                )}
              </div>
            </div>
          </MapOverlayPanel>
        )}
      </div>
    </>
  );
}
