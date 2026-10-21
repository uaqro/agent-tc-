import { canAccessRoute } from './access';
import { drivers, paymentMedia, PAYMENT_TYPE_LABEL, vehicleDetails } from './fleet';
import { sessionPrincipal } from './session';
import { normalize } from './unitSelection';

export type SearchRoute = 'vehicles' | 'drivers' | 'payment-media';
export interface EntitySearchResult {
  id: string;
  entityId: string;
  route: SearchRoute;
  label: string;
  group: string;
  meta: string;
  icon: string;
  searchText: string;
}

export interface SearchDestination {
  entityId: string;
  requestId: number;
}

export function globalSearchCatalog(): EntitySearchResult[] {
  const role = sessionPrincipal().role;
  const units = new Map(vehicleDetails.map((unit) => [unit.vehicleId, unit]));
  return [
    ...(canAccessRoute(role, 'vehicles') ? vehicleDetails.map((unit) => ({
      id: `vehicles:${unit.vehicleId}`, entityId: unit.vehicleId, route: 'vehicles' as const,
      label: unit.plate, group: 'Unidades', icon: 'local_shipping',
      meta: `${unit.vehicleId} · ${unit.brand} ${unit.model} · ${unit.driver}`,
      searchText: `${unit.vehicleId} ${unit.plate} ${unit.brand} ${unit.model} ${unit.driver}`,
    })) : []),
    ...(canAccessRoute(role, 'payment-media') ? paymentMedia.map((medium) => {
      const unit = medium.vehicleId ? units.get(medium.vehicleId) : undefined;
      return {
        id: `payment-media:${medium.id}`, entityId: medium.id, route: 'payment-media' as const,
        label: medium.number, group: 'Medios de pago', icon: 'credit_card',
        meta: `${PAYMENT_TYPE_LABEL[medium.type]} · ${unit?.plate ?? 'Sin unidad'}`,
        searchText: `${medium.number} ${unit?.vehicleId ?? ''} ${unit?.plate ?? ''} ${unit?.driver ?? ''}`,
      };
    }) : []),
    ...(canAccessRoute(role, 'drivers') ? drivers.map((driver) => ({
      id: `drivers:${driver.id}`, entityId: driver.id, route: 'drivers' as const,
      label: driver.name, group: 'Conductores', icon: 'person',
      meta: `${driver.employeeNumber} · ${driver.group}`,
      searchText: `${driver.name} ${driver.employeeNumber}`,
    })) : []),
  ];
}

export function searchEntities(query: string, catalog: EntitySearchResult[]): EntitySearchResult[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  const counts = new Map<string, number>();
  return catalog
    .filter((item) => normalize(item.searchText).includes(needle))
    .sort((a, b) => Number(normalize(b.label) === needle) - Number(normalize(a.label) === needle)
      || a.label.localeCompare(b.label, 'es-MX')
      || a.id.localeCompare(b.id))
    .filter((item) => {
      const count = counts.get(item.group) ?? 0;
      counts.set(item.group, count + 1);
      return count < 10;
    });
}
