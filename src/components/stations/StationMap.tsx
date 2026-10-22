import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Checkbox } from '@er-mobility-mx/design-system';
import { MapPinIcon, PencilIcon, PlusIcon } from '../icons/Icons';
import { networkStations, stationBrands, stationFuelTypes, stationLocations, type NetworkStation } from '../../data/stationNetworks';
import { formatCount } from '../../utils/format';
import './StationMap.css';

const allCities = [...new Set(Object.values(stationLocations).flat())].sort((left, right) => left.localeCompare(right, 'es-MX'));
const stateOptions = Object.keys(stationLocations).sort((left, right) => left.localeCompare(right, 'es-MX'));
const stationIcon = L.divIcon({
  className: 'station-map__marker-shell',
  html: '<span class="station-map__marker"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const userLocationIcon = L.divIcon({
  className: 'station-map__user-marker-shell',
  html: '<span class="station-map__user-marker"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
const DEFAULT_USER_LOCATION: UserLocation = {
  latitude: 19.4387,
  longitude: -99.2044,
  label: 'Oficinas Edenred México · ubicación de referencia',
  isCurrent: false,
};

type UserLocation = { latitude: number; longitude: number; label: string; isCurrent: boolean };
type Coordinate = [number, number];

function isPointInsidePolygon(latitude: number, longitude: number, polygon: Coordinate[]) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const [currentLatitude, currentLongitude] = polygon[current];
    const [previousLatitude, previousLongitude] = polygon[previous];
    const intersects = (currentLatitude > latitude) !== (previousLatitude > latitude) &&
      longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) + currentLongitude;
    if (intersects) inside = !inside;
  }
  return inside;
}

function MultiSelectFilter({ label, values, selected, onChange }: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggleValue = (value: string) => onChange(
    selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  );

  return <details className="station-map__filter">
    <summary>{label}<span>{selected.length ? selected.length : 'Todos'}</span></summary>
    <div className="station-map__filter-options">
      {selected.length > 0 && <button type="button" className="station-map__filter-clear" onClick={() => onChange([])}>Limpiar selección</button>}
      {values.map((value) => <Checkbox
        key={value}
        checked={selected.includes(value)}
        label={value}
        onChange={() => toggleValue(value)}
      />)}
    </div>
  </details>;
}

function createStationPopup(station: NetworkStation) {
  const content = document.createElement('article');
  content.className = 'station-map__popup';
  const name = document.createElement('strong');
  name.textContent = station.name;
  const brand = document.createElement('span');
  brand.className = 'station-map__popup-brand';
  brand.textContent = `${station.brand} · ${station.id}`;
  const address = document.createElement('p');
  address.textContent = station.address;
  const location = document.createElement('p');
  location.textContent = `${station.city}, ${station.state}`;
  const productHeading = document.createElement('strong');
  productHeading.textContent = 'Productos y precios por litro';
  const productList = document.createElement('ul');
  station.products.forEach((product) => {
    const item = document.createElement('li');
    item.textContent = `${product.name}: $${product.pricePerLiter.toFixed(2)} MXN/L`;
    productList.append(item);
  });
  const updated = document.createElement('small');
  updated.textContent = `Precio actualizado: ${new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(station.priceUpdatedAt))}`;
  content.append(name, brand, address, location, productHeading, productList, updated);
  return content;
}

export function StationMap({ onCreateNetwork }: { onCreateNetwork: (stationIds: string[]) => void }) {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [drawnArea, setDrawnArea] = useState<Coordinate[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clustersRef = useRef<L.MarkerClusterGroup | null>(null);
  const drawnLayersRef = useRef<L.FeatureGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const drawHandlerRef = useRef<L.Draw.Polygon | null>(null);

  const cityOptions = useMemo(() => {
    const cities = selectedStates.length
      ? selectedStates.flatMap((state) => stationLocations[state] ?? [])
      : allCities;
    return [...new Set(cities)].sort((left, right) => left.localeCompare(right, 'es-MX'));
  }, [selectedStates]);

  useEffect(() => {
    mapContainerRef.current?.classList.toggle('is-drawing', isDrawing);
  }, [isDrawing]);

  const visibleStations = useMemo(() => networkStations.filter((station) =>
    (!selectedStates.length || selectedStates.includes(station.state)) &&
    (!selectedCities.length || selectedCities.includes(station.city)) &&
    (!selectedBrands.length || selectedBrands.includes(station.brand)) &&
    (!selectedFuelTypes.length || station.products.some((product) => selectedFuelTypes.includes(product.name))) &&
    (!drawnArea || isPointInsidePolygon(station.latitude, station.longitude, drawnArea)),
  ), [selectedStates, selectedCities, selectedBrands, selectedFuelTypes, drawnArea]);

  const hasActiveFilters = selectedStates.length > 0 || selectedCities.length > 0 || selectedBrands.length > 0 || selectedFuelTypes.length > 0 || drawnArea !== null;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, { scrollWheelZoom: true, touchZoom: true }).setView([23.6, -102.5], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const clusters = L.markerClusterGroup({ chunkedLoading: true, removeOutsideVisibleBounds: true, maxClusterRadius: 48 });
    clusters.addTo(map);
    const drawnLayers = L.featureGroup().addTo(map);
    const handlePolygonCreated = (event: L.DrawEvents.Created) => {
      if (!(event.layer instanceof L.Polygon)) return;
      drawnLayers.clearLayers();
      drawnLayers.addLayer(event.layer);
      const coordinates = (event.layer.getLatLngs()[0] as L.LatLng[]).map(({ lat, lng }) => [lat, lng] as Coordinate);
      setDrawnArea(coordinates);
      setIsDrawing(false);
      drawHandlerRef.current = null;
    };
    map.on(L.Draw.Event.CREATED, handlePolygonCreated as L.LeafletEventHandlerFn);
    const userMarker = L.marker([DEFAULT_USER_LOCATION.latitude, DEFAULT_USER_LOCATION.longitude], {
      icon: userLocationIcon,
      zIndexOffset: 1000,
    }).addTo(map).bindTooltip(DEFAULT_USER_LOCATION.label, { direction: 'top', offset: [0, -10] });
    mapRef.current = map;
    clustersRef.current = clusters;
    drawnLayersRef.current = drawnLayers;
    userLocationMarkerRef.current = userMarker;

    return () => {
      drawHandlerRef.current?.disable();
      map.remove();
      mapRef.current = null;
      clustersRef.current = null;
      drawnLayersRef.current = null;
      userLocationMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setUserLocation({ latitude: coords.latitude, longitude: coords.longitude, label: 'Tu ubicación actual', isCurrent: true });
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 300000, timeout: 5000 });
  }, []);

  useEffect(() => {
    const marker = userLocationMarkerRef.current;
    if (!marker) return;
    marker.setLatLng([userLocation.latitude, userLocation.longitude]);
    marker.setTooltipContent(userLocation.label);
  }, [userLocation]);

  useEffect(() => {
    const clusters = clustersRef.current;
    if (!clusters) return;
    clusters.clearLayers();
    visibleStations.forEach((station) => {
      L.marker([station.latitude, station.longitude], { icon: stationIcon })
        .bindPopup(createStationPopup(station), { maxWidth: 280 })
        .addTo(clusters);
    });
  }, [visibleStations]);

  const setStates = (states: string[]) => {
    setSelectedStates(states);
    const availableCities = states.length ? states.flatMap((state) => stationLocations[state] ?? []) : allCities;
    setSelectedCities((current) => current.filter((city) => availableCities.includes(city)));
  };

  const clearFilters = () => {
    setSelectedStates([]);
    setSelectedCities([]);
    setSelectedBrands([]);
    setSelectedFuelTypes([]);
    drawHandlerRef.current?.disable();
    drawHandlerRef.current = null;
    drawnLayersRef.current?.clearLayers();
    setDrawnArea(null);
    setIsDrawing(false);
  };

  const startDrawingArea = () => {
    const map = mapRef.current;
    if (!map) return;
    drawHandlerRef.current?.disable();
    drawnLayersRef.current?.clearLayers();
    setDrawnArea(null);
    const handler = new L.Draw.Polygon(map as L.DrawMap, {
      allowIntersection: false,
      shapeOptions: { color: '#0060df', weight: 2, fillOpacity: 0.14 },
    });
    drawHandlerRef.current = handler;
    handler.enable();
    setIsDrawing(true);
  };

  const clearDrawnArea = () => {
    drawHandlerRef.current?.disable();
    drawHandlerRef.current = null;
    drawnLayersRef.current?.clearLayers();
    setDrawnArea(null);
    setIsDrawing(false);
  };

  const centerOnUser = () => mapRef.current?.setView([userLocation.latitude, userLocation.longitude], 12);

  return <section className="station-map" aria-label="Mapa de estaciones afiliadas">
    <header className="station-map__header">
      <div>
        <h2>Estaciones afiliadas</h2>
        <p>Consulta cobertura, productos y precios por ubicación.</p>
      </div>
      <strong className="station-map__count">{formatCount(visibleStations.length)} estaciones</strong>
    </header>
    <div className="station-map__notice" role="note">Datos de prueba: ubicaciones, direcciones y precios simulados.</div>
    <div className="station-map__toolbar" aria-label="Filtros del mapa">
      <MultiSelectFilter label="Estado" values={stateOptions} selected={selectedStates} onChange={setStates} />
      <MultiSelectFilter label="Ciudad / municipio" values={cityOptions} selected={selectedCities} onChange={setSelectedCities} />
      <MultiSelectFilter label="Marca" values={stationBrands} selected={selectedBrands} onChange={setSelectedBrands} />
      <MultiSelectFilter label="Combustible" values={stationFuelTypes} selected={selectedFuelTypes} onChange={setSelectedFuelTypes} />
      <button type="button" className={`station-map__draw${isDrawing ? ' is-active' : ''}`} onClick={isDrawing ? clearDrawnArea : startDrawingArea} aria-pressed={isDrawing}>
        <PencilIcon width={16} height={16} />{isDrawing ? 'Cancelar contorno' : drawnArea ? 'Redibujar contorno' : 'Dibujar contorno'}
      </button>
      <button type="button" className="station-map__locate" onClick={centerOnUser} title="Centrar mapa en mi ubicación" aria-label="Centrar mapa en mi ubicación">
        <MapPinIcon width={16} height={16} />Mi ubicación
      </button>
      {hasActiveFilters && <>
        <button type="button" className="station-map__clear" onClick={clearFilters}>Limpiar filtros</button>
        <button type="button" className="btn btn--primary btn--sm station-map__create-network" disabled={!visibleStations.length} onClick={() => onCreateNetwork(visibleStations.map((station) => station.id))}>
          <PlusIcon width={16} height={16} />Crear red personalizada · {formatCount(visibleStations.length)}
        </button>
      </>}
    </div>
    {drawnArea && <p className="station-map__area-status" role="status">Contorno aplicado: {formatCount(visibleStations.length)} estaciones dentro del área.</p>}
    {isDrawing && <p className="station-map__draw-help" role="status">Haz clic para marcar cada vértice del contorno y doble clic en el último punto para cerrarlo y filtrar las estaciones.</p>}
    <div className="station-map__canvas" ref={mapContainerRef} aria-label={`Mapa de México con ${formatCount(visibleStations.length)} estaciones de prueba`} />
  </section>;
}