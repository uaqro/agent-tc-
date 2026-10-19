export interface NetworkStation {
  id: string;
  name: string;
  state: string;
  city: string;
  brand: string;
}

export interface StationNetwork {
  id: string;
  name: string;
  mode: 'allow' | 'block';
  stationIds: string[];
  updated: string;
  updatedBy: string;
  voucherNotes: string[];
}

export const stationLocations: Record<string, string[]> = {
  'Ciudad de México': ['Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuauhtémoc', 'Iztapalapa', 'Miguel Hidalgo', 'Tlalpan'],
  'Estado de México': ['Atizapán de Zaragoza', 'Cuautitlán Izcalli', 'Ecatepec', 'Naucalpan', 'Nezahualcóyotl', 'Tlalnepantla', 'Toluca'],
  Jalisco: ['Guadalajara', 'Lagos de Moreno', 'Puerto Vallarta', 'Tlaquepaque', 'Zapopan'],
  'Nuevo León': ['Apodaca', 'Guadalupe', 'Monterrey', 'San Nicolás', 'San Pedro Garza García'],
  Puebla: ['Atlixco', 'Puebla', 'San Andrés Cholula', 'Tehuacán'],
  Querétaro: ['Corregidora', 'El Marqués', 'Querétaro', 'San Juan del Río'],
  Guanajuato: ['Celaya', 'Irapuato', 'León', 'Salamanca'],
  Veracruz: ['Boca del Río', 'Coatzacoalcos', 'Veracruz', 'Xalapa'],
  Chihuahua: ['Chihuahua', 'Ciudad Juárez', 'Delicias'],
  Yucatán: ['Mérida', 'Progreso', 'Valladolid'],
};

export const stationBrands = ['Pemex', 'Shell', 'BP', 'G500', 'Mobil', 'Repsol', 'Hidrosina', 'Oxxo Gas', 'Valero', 'Akron'];
const states = Object.keys(stationLocations);

export const networkStations: NetworkStation[] = Array.from({ length: 7500 }, (_, index) => {
  const state = states[index % states.length];
  const cities = stationLocations[state];
  const city = cities[Math.floor(index / states.length) % cities.length];
  const brand = stationBrands[Math.floor(index / 3) % stationBrands.length];
  return {
    id: `ES-${String(index + 1).padStart(5, '0')}`,
    name: `${brand} ${city} ${String((index % 97) + 1).padStart(2, '0')}`,
    state, city, brand,
  };
});

export const seedStationNetworks: StationNetwork[] = [
  { id: 's-norte', name: 'Corredor Norte', mode: 'allow', stationIds: networkStations.slice(0, 42).map((station) => station.id), updated: '2026-10-08', updatedBy: 'Jorge Vera', voucherNotes: ['Nota Vales · Combustible autorizado'] },
  { id: 's-sur', name: 'Corredor Sur', mode: 'allow', stationIds: networkStations.slice(42, 70).map((station) => station.id), updated: '2026-10-06', updatedBy: 'Admin Fleet', voucherNotes: [] },
  { id: 's-pref', name: 'Estaciones preferentes', mode: 'allow', stationIds: networkStations.slice(70, 185).map((station) => station.id), updated: '2026-10-06', updatedBy: 'Admin Fleet', voucherNotes: [] },
  { id: 's-carretera', name: 'Estaciones de carretera', mode: 'block', stationIds: networkStations.slice(185, 191).map((station) => station.id), updated: '2026-10-06', updatedBy: 'Admin Fleet', voucherNotes: [] },
];

export const networkModeLabel = (mode: StationNetwork['mode']) => mode === 'allow' ? 'Permitidas' : 'No permitidas';