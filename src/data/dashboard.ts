import type { ChartSeries, MenuGroup } from '../types';
import { clientAccount } from './client';

/** Resumen sits above the sections; the sections follow Edenred One: products, intelligence and fleet. */
export const menuGroups: MenuGroup[] = [
  {
    id: 'inicio',
    label: '',
    items: [{ id: 'resumen', label: 'Resumen', icon: 'chart' }],
  },
  {
    id: 'combustible',
    label: 'Combustible',
    items: [
      { id: 'saldos', label: 'Saldos', icon: 'wallet' },
      { id: 'reglas-limites', label: 'Reglas y límites', icon: 'lock' },
      { id: 'medios-pago', label: 'Medios de pago', icon: 'card' },
    ],
  },
  {
    id: 'peaje',
    label: 'Peaje',
    items: [
      { id: 'peaje-saldos', label: 'Saldos', icon: 'wallet' },
      { id: 'peaje-reglas-limites', label: 'Reglas y límites', icon: 'lock' },
      { id: 'peaje-medios-pago', label: 'Medios de pago', icon: 'card' },
    ],
  },
  {
    id: 'mantenimiento',
    label: 'Mantenimiento',
    items: [{ id: 'mantenimiento-resumen', label: 'Resumen', icon: 'gear' }],
  },
  {
    id: 'inteligencia',
    label: 'Inteligencia',
    items: [
      { id: 'reportes', label: 'Reportes', icon: 'file' },
      { id: 'insights', label: 'Insights & Alertas', icon: 'sparkles' },
      { id: 'optimizador', label: 'Optimizador de gasolineras', icon: 'compass' },
      { id: 'ted', label: 'TED', icon: 'chat' },
    ],
  },
  {
    id: 'flota',
    label: 'Flota',
    items: [
      { id: 'vehiculos', label: 'Vehículos', icon: 'truck' },
      { id: 'conductores', label: 'Conductores', icon: 'user' },
    ],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    items: [
      { id: 'empresa-parametros', label: 'Parámetros', icon: 'sliders' },
      { id: 'empresa-facturas', label: 'Facturas', icon: 'receipt' },
      { id: 'empresa-usuarios', label: 'Usuarios', icon: 'users' },
    ],
  },
];

/** Only listed while dev mode is on. */
export const devMenuGroup: MenuGroup = {
  id: 'dev',
  label: 'Dev',
  items: [{ id: 'dev-mejoras-api', label: 'Mejoras API ZERO', icon: 'code' }],
};

export const costPerKilometer = {
  labels: ['Ene 26', 'Feb 26', 'Mar 26', 'Abr 26', 'May 26', 'Jun 26', 'Jul 26'],
  yMin: 0,
  yMax: 0.75,
  series: [
    {
      name: clientAccount.name,
      color: '#2f6bff',
      values: [0.42, 0.55, 0.38, 0.61, 0.49, 0.66, 0.58],
    },
  ] satisfies ChartSeries[],
};

export const refillsAndCuts = {
  labels: ['Ene 26', 'Feb 26', 'Mar 26', 'Abr 26', 'May 26', 'Jun 26', 'Jul 26'],
  yMin: 75,
  yMax: 175,
  series: [
    { name: 'Recargas', color: '#16a34a', values: [120, 145, 98, 160, 132, 150, 118] },
    { name: 'Recortes', color: '#e4572e', values: [88, 95, 82, 110, 101, 124, 96] },
  ] satisfies ChartSeries[],
};

/** The legacy page renders these panels empty until a fleet filter is applied. */
export const vehiclePerformance: { labels: string[]; series: ChartSeries[] } = {
  labels: [],
  series: [],
};

export const organizationalConsumption: { labels: string[]; series: ChartSeries[] } = {
  labels: [],
  series: [],
};
