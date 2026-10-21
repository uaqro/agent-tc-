export interface NetworkStation {
  id: string;
  name: string;
  state: string;
  city: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
  products: { name: string; pricePerLiter: number }[];
  priceUpdatedAt: string;
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
  Aguascalientes: ['Aguascalientes'],
  'Baja California': ['Mexicali', 'Tijuana'],
  'Baja California Sur': ['La Paz', 'Los Cabos'],
  Campeche: ['Campeche'],
  Chiapas: ['Tuxtla Gutiérrez'],
  Coahuila: ['Saltillo', 'Torreón'],
  Colima: ['Colima'],
  Durango: ['Durango'],
  Guerrero: ['Chilpancingo'],
  Hidalgo: ['Pachuca'],
  Michoacán: ['Morelia'],
  Morelos: ['Cuernavaca'],
  Nayarit: ['Tepic'],
  Oaxaca: ['Oaxaca'],
  'Quintana Roo': ['Cancún'],
  'San Luis Potosí': ['San Luis Potosí'],
  Sinaloa: ['Culiacán'],
  Sonora: ['Hermosillo'],
  Tabasco: ['Villahermosa'],
  Tamaulipas: ['Ciudad Victoria'],
  Tlaxcala: ['Tlaxcala'],
  Zacatecas: ['Zacatecas'],
};

export const stationBrands = ['Pemex', 'Shell', 'BP', 'G500', 'Mobil', 'Repsol', 'Hidrosina', 'Oxxo Gas', 'Valero', 'Akron'];
const states = Object.keys(stationLocations);
const stateCenters: Record<string, [number, number]> = {
  'Ciudad de México': [19.4326, -99.1332], 'Estado de México': [19.2826, -99.6557], Jalisco: [20.6597, -103.3496],
  'Nuevo León': [25.6866, -100.3161], Puebla: [19.0414, -98.2063], Querétaro: [20.5888, -100.3899],
  Guanajuato: [21.019, -101.2574], Veracruz: [19.1738, -96.1342], Chihuahua: [28.6353, -106.0889], Yucatán: [20.9674, -89.5926],
  Aguascalientes: [21.8853, -102.2916], 'Baja California': [32.6245, -115.4523], 'Baja California Sur': [24.1426, -110.3128],
  Campeche: [19.8301, -90.5349], Chiapas: [16.7528, -93.1151], Coahuila: [25.4383, -100.9737], Colima: [19.2433, -103.725],
  Durango: [24.0277, -104.6532], Guerrero: [17.5515, -99.5006], Hidalgo: [20.1011, -98.7591], Michoacán: [19.7008, -101.1844],
  Morelos: [18.9242, -99.2216], Nayarit: [21.5039, -104.8946], Oaxaca: [17.0732, -96.7266], 'Quintana Roo': [21.1619, -86.8515],
  'San Luis Potosí': [22.1565, -100.9855], Sinaloa: [24.8091, -107.394], Sonora: [29.0729, -110.9559],
  Tabasco: [17.9892, -92.9475], Tamaulipas: [23.7369, -99.1411], Tlaxcala: [19.3139, -98.2416], Zacatecas: [22.7709, -102.5832],
};
export const stationFuelTypes = ['Magna', 'Premium', 'Diésel'];
const addressPrefixes = ['Av. Muestra', 'Blvd. de Prueba', 'Calz. Ejemplo'];

export const networkStations: NetworkStation[] = Array.from({ length: 7500 }, (_, index) => {
  const state = states[index % states.length];
  const cities = stationLocations[state];
  const cityIndex = Math.floor(index / states.length) % cities.length;
  const city = cities[cityIndex];
  const brand = stationBrands[Math.floor(index / 3) % stationBrands.length];
  const [centerLatitude, centerLongitude] = stateCenters[state];
  const productSelection = stationFuelTypes.filter((_, productIndex) => productIndex === 0 || (index + productIndex) % (productIndex + 2) !== 0);
  return {
    id: `ES-${String(index + 1).padStart(5, '0')}`,
    name: `${brand} ${city} ${String((index % 97) + 1).padStart(2, '0')}`,
    state,
    city,
    brand,
    address: `${addressPrefixes[index % addressPrefixes.length]} ${100 + (index % 900)}, ${city}, ${state}`,
    latitude: centerLatitude + (cityIndex % 5 - 2) * 0.045 + (index % 11 - 5) * 0.002,
    longitude: centerLongitude + (cityIndex % 5 - 2) * 0.045 + (Math.floor(index / 11) % 11 - 5) * 0.002,
    products: productSelection.map((product) => ({
      name: product,
      pricePerLiter: Number(((product === 'Premium' ? 24.8 : product === 'Diésel' ? 25.1 : 22.6) + (index % 37) * 0.017).toFixed(2)),
    })),
    priceUpdatedAt: `2026-10-${String(15 + index % 5).padStart(2, '0')}T12:00:00-06:00`,
  };
});

export const seedStationNetworks: StationNetwork[] = [
  { id: 's-norte', name: 'Corredor Norte', mode: 'allow', stationIds: networkStations.slice(0, 42).map((station) => station.id), updated: '2026-10-08', updatedBy: 'Jorge Vera', voucherNotes: ['Nota Vales · Combustible autorizado'] },
  { id: 's-sur', name: 'Corredor Sur', mode: 'allow', stationIds: networkStations.slice(42, 70).map((station) => station.id), updated: '2026-10-06', updatedBy: 'Admin Fleet', voucherNotes: [] },
  { id: 's-pref', name: 'Estaciones preferentes', mode: 'allow', stationIds: networkStations.slice(70, 185).map((station) => station.id), updated: '2026-10-06', updatedBy: 'Admin Fleet', voucherNotes: [] },
  { id: 's-carretera', name: 'Estaciones de carretera', mode: 'block', stationIds: networkStations.slice(185, 191).map((station) => station.id), updated: '2026-10-06', updatedBy: 'Admin Fleet', voucherNotes: [] },
];

export const networkModeLabel = (mode: StationNetwork['mode']) => mode === 'allow' ? 'Permitidas' : 'No permitidas';