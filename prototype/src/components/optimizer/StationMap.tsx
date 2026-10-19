/**
 * Station map of the optimizer (eOne US-020) on Leaflet. Colour follows the share of redirectable loads, size the
 * litres (normalised to the 95th percentile), and a white border marks stations in the volumetric control directory.
 * The selected station draws dashed lines to the stations the engine proposes instead.
 *
 * The OpenStreetMap tiles are the only network call of the page. If they fail, the stations still show.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { markerRadius, percentile, type StationStats } from '../../domain/optimizer/metrics';
import type { Station } from '../../domain/optimizer/types';
import './StationMap.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const BASEMAP_TIMEOUT_MS = 8000;

type Rgb = [number, number, number];
const GREEN: Rgb = [0, 120, 64];
const AMBER: Rgb = [224, 161, 0];
const RED: Rgb = [202, 14, 0];
const LINE = '#0060df';

function mix(a: Rgb, b: Rgb, t: number): string {
  const c = a.map((value, index) => Math.round(value + (b[index] - value) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function shareColor(share: number): string {
  const s = Math.min(1, Math.max(0, share));
  return s <= 0.5 ? mix(GREEN, AMBER, s / 0.5) : mix(AMBER, RED, (s - 0.5) / 0.5);
}

interface StationMapProps {
  stations: StationStats[];
  stationsById: Map<string, Station>;
  selectedStationId: string | null;
  onSelect: (stationId: string) => void;
}

export default function StationMap({ stations, stationsById, selectedStationId, onSelect }: StationMapProps) {
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tileErrors, setTileErrors] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const lastFitKey = useRef('');

  const p95 = useMemo(() => percentile(stations.map((stats) => stats.liters), 0.95), [stations]);
  const selected = stations.find((stats) => stats.station.id === selectedStationId) ?? null;

  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([24.5, -104.5], 5);
    const tiles = L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 });
    tiles.on('tileload', () => setTilesLoaded(true));
    tiles.on('tileerror', () => setTileErrors((count) => count + 1));
    tiles.addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const timer = window.setTimeout(() => setTimedOut(true), BASEMAP_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (map === null || layer === null) return;
    layer.clearLayers();

    for (const stats of stations) {
      const isSelected = stats.station.id === selectedStationId;
      const dimmed = selectedStationId !== null && !isSelected;
      const marker = L.circleMarker([stats.station.lat, stats.station.lng], {
        radius: markerRadius(stats.liters, p95),
        color: isSelected ? LINE : stats.station.cv ? '#ffffff' : 'rgba(0,0,0,0.35)',
        weight: isSelected ? 3 : stats.station.cv ? 2 : 1,
        fillColor: shareColor(stats.redirectableShare),
        fillOpacity: dimmed ? 0.15 : 0.85,
        opacity: dimmed ? 0.25 : 1,
      });
      marker.bindTooltip(
        `${stats.station.name}${stats.station.cv ? ' · CV' : ''}<br>${Math.round(stats.redirectableShare * 100)} % redirigible · ${stats.loads} cargas`,
      );
      marker.on('click', () => onSelect(stats.station.id));
      marker.addTo(layer);
    }

    if (selected !== null) {
      selected.destinations.forEach((destination, index) => {
        const target = stationsById.get(destination.stationId);
        if (!target) return;
        L.polyline(
          [
            [selected.station.lat, selected.station.lng],
            [target.lat, target.lng],
          ],
          { color: LINE, weight: 2, dashArray: '6 6' },
        ).addTo(layer);
        L.marker([target.lat, target.lng], {
          icon: L.divIcon({ className: 'station-map__destination', html: `<span>${index + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
          title: `${index + 1}. ${target.name}${target.cv ? ' · CV' : ''} · ${destination.loads} cargas`,
        }).addTo(layer);
      });
    }

    const points: L.LatLngExpression[] =
      selected !== null
        ? [
            [selected.station.lat, selected.station.lng],
            ...selected.destinations
              .map((destination) => stationsById.get(destination.stationId))
              .filter((station): station is Station => station !== undefined)
              .map((station) => [station.lat, station.lng] as L.LatLngExpression),
          ]
        : stations.map((stats) => [stats.station.lat, stats.station.lng] as L.LatLngExpression);
    const fitKey = selected !== null ? `sel:${selected.station.id}` : `all:${stations.length}`;
    if (points.length > 0 && fitKey !== lastFitKey.current) {
      lastFitKey.current = fitKey;
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    }
  }, [stations, selected, selectedStationId, p95, stationsById, onSelect]);

  const basemapFailed = !tilesLoaded && (tileErrors > 0 || timedOut);

  return (
    <div className="station-map">
      {basemapFailed && (
        <p className="station-map__warning" role="status">
          No se pudo cargar el mapa base (sin conexión o bloqueado por la red). Las estaciones y sus cálculos se muestran igual.
        </p>
      )}
      <div className="station-map__canvas" ref={containerRef} role="region" aria-label="Mapa de estaciones" />
      <div className="station-map__legend">
        <span className="station-map__swatch station-map__swatch--green">0 % redirigible</span>
        <span className="station-map__swatch station-map__swatch--amber">50 %</span>
        <span className="station-map__swatch station-map__swatch--red">100 %</span>
        <span>Borde blanco: estación con control volumétrico · {stations.length} estaciones</span>
      </div>
    </div>
  );
}
