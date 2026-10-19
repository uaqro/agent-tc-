import type { AppRoute } from '../types';

/* ── Insights & Alertas ─────────────────────────────────────────── */

export type Severity = 'critical' | 'warning' | 'info' | 'success';

export interface InsightAction {
  label: string;
  /** Opens another module of the mockup; without it the action only confirms with a notice. */
  route?: AppRoute;
  notice: string;
}

export interface FleetAlert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  meta: string;
  when: string;
  action: InsightAction;
}

export interface OptimizationInsight {
  id: string;
  title: string;
  detail: string;
  savingsMXN: number;
  effort: 'Bajo' | 'Medio' | 'Alto';
  action: InsightAction;
}

export const SEVERITY_META: Record<Severity, { label: string; plural: string }> = {
  critical: { label: 'Crítica', plural: 'Críticas' },
  warning: { label: 'Advertencia', plural: 'Advertencias' },
  info: { label: 'Información', plural: 'Informativas' },
  success: { label: 'Logro', plural: 'Logros' },
};

export const fleetAlerts: FleetAlert[] = [
  {
    id: 'a-1',
    severity: 'critical',
    title: 'Consumo anómalo · TGP-91-7K · Marisol Vega',
    detail:
      '3 cargas en 5 horas por 312 L en total; la capacidad del tanque es de 80 L (3.9× el máximo). Posible clonación de tarjeta o carga a terceros.',
    meta: 'Ruta Centro · Hoy 06:12–11:05 h',
    when: 'Hoy 11:20',
    action: { label: 'Solicitar evidencia', notice: 'Se pidió a Marisol Vega la evidencia de las 3 cargas.' },
  },
  {
    id: 'a-2',
    severity: 'critical',
    title: 'Carga fuera de zona · HGF-29-8T · Miguel Santoyo',
    detail:
      '96 L cargados en Hermosillo, Son., mientras la unidad reporta posición en Puebla. Se recomienda bloquear la tarjeta de inmediato.',
    meta: 'Ruta Sur · Diferencia de 1,860 km',
    when: 'Hoy 04:38',
    action: { label: 'Bloquear tarjeta', notice: 'Tarjeta de HGF-29-8T bloqueada. Se notificó al conductor.' },
  },
  {
    id: 'a-3',
    severity: 'critical',
    title: 'Saldo en cero con ruta asignada · RAM-45-2B',
    detail: 'La unidad tiene ruta programada mañana a las 05:00 y no podrá cargar. Su consumo semanal promedio es de $1,850.',
    meta: 'Ruta Norte · Rodolfo Aguirre',
    when: 'Hoy 09:02',
    action: { label: 'Fondear', route: 'dispersion', notice: 'Abriendo Saldos.' },
  },
  {
    id: 'a-4',
    severity: 'critical',
    title: 'Cargas sin odómetro · 9 unidades',
    detail:
      'JKM-33-4A, NBV-62-3F, ZUT-08-5E y 6 más llevan más de 72 h cargando sin capturar odómetro; el rendimiento no se puede calcular.',
    meta: '9 unidades · Validación desactivada en su política',
    when: 'Ayer 18:00',
    action: { label: 'Revisar política', route: 'limits', notice: 'Abriendo Políticas de uso.' },
  },
  {
    id: 'a-5',
    severity: 'warning',
    title: 'Rendimiento bajo umbral · 7 unidades de Ruta Sur',
    detail: 'Promedian 6.5 km/L contra 8.2 km/L esperado (−20.7%). Sobrecosto estimado de $38,400 al mes.',
    meta: 'Ruta Sur · Mes actual',
    when: 'Octubre 2026',
    action: { label: 'Ver reporte', route: 'reports', notice: 'Abriendo Reportes.' },
  },
  {
    id: 'a-6',
    severity: 'warning',
    title: 'Límite mensual al 90% · 4 tarjetas',
    detail: 'ZUT-08-5E, NBV-62-3F, JKM-33-4A y TGP-91-7K agotarán su límite en 4 a 7 días hábiles al ritmo actual.',
    meta: '4 tarjetas · Ciclo 1–31 oct',
    when: 'Hoy',
    action: { label: 'Ajustar límites', route: 'limits', notice: 'Abriendo Políticas de uso.' },
  },
  {
    id: 'a-7',
    severity: 'warning',
    title: 'Saldo atrapado · VLQ-12-9D sin conductor',
    detail: '$4,280 sin movimiento desde hace 21 días en una unidad sin conductor asignado.',
    meta: 'Ruta Sur · Sin cargas en 21 días',
    when: 'Hoy',
    action: { label: 'Recortar saldo', route: 'dispersion', notice: 'Abriendo Saldos.' },
  },
  {
    id: 'a-8',
    severity: 'warning',
    title: 'Cargas en horario restringido · 3 unidades',
    detail: 'Cargas entre 23:00 y 04:00 en unidades cuya política solo permite de 06:00 a 22:00. La política está pausada.',
    meta: 'Flota ejecutiva · Últimos 7 días',
    when: 'Ayer',
    action: { label: 'Revisar política', route: 'limits', notice: 'Abriendo Políticas de uso.' },
  },
  {
    id: 'a-9',
    severity: 'info',
    title: 'Actualización de precios · Noroeste y Noreste',
    detail: 'Diésel en Noroeste: $25.10 → $24.60/L. Noreste: $24.95 → $24.40/L. Afecta a 29 tarjetas con límite en pesos.',
    meta: '2 regiones · 29 tarjetas',
    when: '14 oct',
    action: { label: 'Ver estaciones', route: 'optimizer', notice: 'Abriendo el Optimizador de gasolineras.' },
  },
  {
    id: 'a-10',
    severity: 'info',
    title: 'Tarjetas inactivas · 7 tarjetas con más de 60 días sin uso',
    detail: 'Mantenerlas activas con saldo representa riesgo de uso indebido. Puedes recortar su saldo y suspenderlas.',
    meta: '7 tarjetas · $11,960 en saldo',
    when: 'Hoy',
    action: { label: 'Gestionar', route: 'dispersion', notice: 'Abriendo Saldos.' },
  },
  {
    id: 'a-11',
    severity: 'info',
    title: 'Reporte ejecutivo semanal listo · Semana 41',
    detail: 'Consumo por grupo, top 5 conductores, ahorro por cambio de estación y proyección de cierre de mes.',
    meta: 'PDF y Excel · 18 páginas',
    when: 'Hoy 07:00',
    action: { label: 'Descargar', notice: 'Descargando el reporte ejecutivo de la semana 41.' },
  },
  {
    id: 'a-12',
    severity: 'success',
    title: 'Meta de ahorro superada · Ruta Norte +12.3%',
    detail: 'El 84% de los conductores cargó en las estaciones recomendadas por TED. Segundo mes consecutivo en primer lugar.',
    meta: 'Objetivo $52,000 · Logrado $58,400',
    when: 'Octubre 2026',
    action: { label: 'Ver detalle', route: 'optimizer', notice: 'Abriendo el Optimizador de gasolineras.' },
  },
];

export const optimizationInsights: OptimizationInsight[] = [
  {
    id: 'o-1',
    title: 'Cambiar de estación en 12 tarjetas',
    detail: 'Hay estaciones de la red a menos de 3 km de su ruta habitual con precio menor en $0.90 a $1.60 por litro.',
    savingsMXN: 21_400,
    effort: 'Bajo',
    action: { label: 'Ver recomendaciones', route: 'optimizer', notice: 'Abriendo el Optimizador de gasolineras.' },
  },
  {
    id: 'o-2',
    title: 'Pasar Ruta Centro a reposición a tope semanal',
    detail: 'Hoy recibe montos fijos y acumula $18,200 sin usar al cierre de mes. A tope solo se envía lo consumido.',
    savingsMXN: 18_200,
    effort: 'Bajo',
    action: { label: 'Crear automatización', route: 'dispersion', notice: 'Abriendo Saldos.' },
  },
  {
    id: 'o-3',
    title: 'Restringir Premium a Flota ejecutiva',
    detail: '14% de las cargas de Ruta Norte y Ruta Sur son Premium aunque sus unidades usan Magna.',
    savingsMXN: 9_700,
    effort: 'Bajo',
    action: { label: 'Editar política', route: 'limits', notice: 'Abriendo Políticas de uso.' },
  },
  {
    id: 'o-4',
    title: 'Activar validación de odómetro en Ruta Sur',
    detail: 'Sin odómetro no se detecta el bajo rendimiento; las flotas que lo validan reducen su consumo 6% en promedio.',
    savingsMXN: 7_900,
    effort: 'Medio',
    action: { label: 'Editar política', route: 'limits', notice: 'Abriendo Políticas de uso.' },
  },
  {
    id: 'o-5',
    title: 'Recortar saldo de 7 tarjetas inactivas',
    detail: 'Regresa $11,960 a la cuenta concentradora y elimina el riesgo de uso indebido.',
    savingsMXN: 11_960,
    effort: 'Bajo',
    action: { label: 'Recortar', route: 'dispersion', notice: 'Abriendo Saldos.' },
  },
];

/* ── Optimizador de gasolineras ─────────────────────────────────── */

export interface RegionOpportunity {
  id: string;
  name: string;
  states: string;
  color: string;
  savingsMXN: number;
  stations: number;
  cards: number;
  gapPct: number;
}

export interface StationSwap {
  plate: string;
  driver: string;
  group: string;
  fromStation: string;
  fromPrice: number;
  toStation: string;
  toPrice: number;
  detourKm: number;
  monthlyLiters: number;
}

export const optimizerSummary = {
  updated: 'hoy, 06:00 h',
  activeCards: 26,
  currentPrice: 24.8,
  recommendedPrice: 23.66,
  alternativeStations: 179,
  optimizableCards: 12,
};

export const regionOpportunities: RegionOpportunity[] = [
  { id: 'r-cdmx', name: 'CDMX / Valle de México', states: 'CDMX, Edomex, Mor', color: '#ca0e00', savingsMXN: 84_600, stations: 53, cards: 48, gapPct: 10.7 },
  { id: 'r-centro', name: 'Centro / Bajío', states: 'Jal, Gto, Qro, Ags', color: '#0060df', savingsMXN: 62_800, stations: 41, cards: 35, gapPct: 9.3 },
  { id: 'r-noroeste', name: 'Noroeste', states: 'BC, Son, Sin, Nay', color: '#0a7a7a', savingsMXN: 48_200, stations: 34, cards: 28, gapPct: 8.1 },
  { id: 'r-noreste', name: 'Noreste', states: 'NL, Tamps, Coah', color: '#bf410f', savingsMXN: 31_400, stations: 29, cards: 22, gapPct: 6.4 },
  { id: 'r-sur', name: 'Sur / Sureste', states: 'Oax, Chis, Ver, Tab', color: '#6b4dc7', savingsMXN: 24_100, stations: 22, cards: 18, gapPct: 5.9 },
];

export const stationSwaps: StationSwap[] = [
  { plate: 'ZUT-08-5E', driver: 'Javier Ortiz', group: 'Ruta Centro', fromStation: 'PEMEX Autopista km 142', fromPrice: 25.34, toStation: 'G500 Cuautitlán Norte', toPrice: 23.46, detourKm: 2.4, monthlyLiters: 820 },
  { plate: 'TGP-91-7K', driver: 'Marisol Vega', group: 'Ruta Centro', fromStation: 'BP Vallejo', fromPrice: 25.7, toStation: 'PEMEX Vallejo 2', toPrice: 24.3, detourKm: 0.8, monthlyLiters: 740 },
  { plate: 'HGF-29-8T', driver: 'Miguel Santoyo', group: 'Ruta Sur', fromStation: 'PEMEX Toluca Centro', fromPrice: 25.0, toStation: 'Orsan Metepec', toPrice: 23.68, detourKm: 3.1, monthlyLiters: 680 },
  { plate: 'RAM-45-2B', driver: 'Rodolfo Aguirre', group: 'Ruta Norte', fromStation: 'Gulf Monterrey Sur', fromPrice: 24.6, toStation: 'Hidrosina Apodaca', toPrice: 23.56, detourKm: 4.2, monthlyLiters: 900 },
  { plate: 'NBV-62-3F', driver: 'Carla Ramos', group: 'Ruta Norte', fromStation: 'PEMEX Gdl Oriente', fromPrice: 25.18, toStation: 'Fuelgas Tlaquepaque', toPrice: 24.22, detourKm: 1.9, monthlyLiters: 760 },
  { plate: 'JKM-33-4A', driver: 'Luis Beltrán', group: 'Ruta Norte', fromStation: 'Shell San Nicolás', fromPrice: 24.92, toStation: 'PEMEX Universidad', toPrice: 24.05, detourKm: 1.2, monthlyLiters: 640 },
  { plate: 'PQR-77-1C', driver: 'Ana Sandoval', group: 'Flota ejecutiva', fromStation: 'Mobil Santa Fe', fromPrice: 26.1, toStation: 'G500 Vasco de Quiroga', toPrice: 24.88, detourKm: 1.6, monthlyLiters: 310 },
];

export const swapSavings = (swap: StationSwap) => (swap.fromPrice - swap.toPrice) * swap.monthlyLiters;

/* ── TED ─────────────────────────────────────────────────────────── */

export interface TedAnswer {
  keywords: string[];
  text: string;
}

export const tedSuggestions = [
  '¿Cuál es el gasto de combustible esta semana?',
  '¿Qué tarjetas están cerca de su límite?',
  '¿Qué unidades tienen consumo anómalo?',
  '¿Cuánto ahorramos en octubre vs septiembre?',
  '¿Dónde conviene cargar en Ruta Centro?',
  'Genera un resumen ejecutivo del mes',
];

export const tedAnswers: TedAnswer[] = [
  {
    keywords: ['gasto', 'semana', 'gastamos'],
    text:
      'Esta semana llevas **$186,420** en combustible (7,517 L), un 4.2% más que la semana pasada.\n\n• Ruta Norte: $72,300\n• Ruta Centro: $61,850\n• Ruta Sur: $38,900\n• Flota ejecutiva: $13,370\n\nEl aumento viene de Ruta Centro, donde subieron las cargas en estaciones de autopista.',
  },
  {
    keywords: ['límite', 'limite', 'tarjetas'],
    text:
      'Hay **4 tarjetas al 90% o más** de su límite mensual:\n\n• ZUT-08-5E · 96% · se agota en 2 días\n• NBV-62-3F · 93%\n• JKM-33-4A · 91%\n• TGP-91-7K · 90% (tiene una alerta de consumo anómalo abierta)\n\nTe sugiero dar una excepción temporal a ZUT-08-5E y revisar TGP-91-7K antes de ampliarle el límite.',
  },
  {
    keywords: ['anómalo', 'anomalo', 'anomalía', 'fraude', 'sospech'],
    text:
      'Detecté **2 casos críticos** en las últimas 24 h:\n\n1. **TGP-91-7K** · 3 cargas en 5 h por 312 L con un tanque de 80 L.\n2. **HGF-29-8T** · carga en Hermosillo mientras la unidad estaba en Puebla.\n\nAmbos tienen una alerta abierta en Insights & Alertas. Recomiendo bloquear la tarjeta de HGF-29-8T y pedir evidencia a Marisol Vega.',
  },
  {
    keywords: ['ahorr', 'octubre', 'septiembre'],
    text:
      'En octubre llevas **$58,400 de ahorro** por cargar en estaciones recomendadas, contra $49,100 en septiembre (+18.9%).\n\nRuta Norte aporta el 46% del ahorro. Si las 12 tarjetas pendientes cambian de estación, el ahorro mensual subiría unos $21,400 más.',
  },
  {
    keywords: ['dónde', 'donde', 'cargar', 'estación', 'estacion', 'centro'],
    text:
      'Para Ruta Centro las mejores opciones de hoy son:\n\n• **G500 Cuautitlán Norte** · $23.46/L · a 2.4 km de la ruta\n• **PEMEX Vallejo 2** · $24.30/L · a 0.8 km\n\nCambiar las dos tarjetas con más consumo ahorraría alrededor de **$2,580 al mes**. Puedes enviarles la sugerencia desde el Optimizador.',
  },
  {
    keywords: ['resumen', 'ejecutivo', 'mes'],
    text:
      '**Resumen de octubre (al día 15)**\n\n• Gasto: $412,300 · 16,625 L · 26 tarjetas activas\n• Rendimiento promedio: 7.8 km/L (−2.1% vs septiembre)\n• Ahorro por estación recomendada: $58,400\n• Alertas: 4 críticas, 4 advertencias\n• Proyección de cierre: $851,000, 3% sobre presupuesto\n\nLa principal palanca es Ruta Sur: corregir su rendimiento recuperaría unos $38,400 al mes.',
  },
];

export const tedFallback =
  'Todavía no tengo datos para responder eso en este prototipo. Prueba con el gasto de la semana, las tarjetas cerca de su límite, el consumo anómalo, el ahorro del mes o dónde conviene cargar.';
