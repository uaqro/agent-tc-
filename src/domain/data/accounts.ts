/**
 * Cuentas cliente de Edenred México.
 * ═════════════════════════════════
 * Unidad de aislamiento de datos: toda flota, alerta y consumo pertenece a una
 * cuenta, y el alcance del rol se mide contra ellas.
 *
 * Caso límite: una cuenta dada de baja que sigue en el catálogo porque su
 * histórico debe conservarse.
 */

/** Cuenta cliente: la unidad de aislamiento de tenant. */
export type Account = {
  id: string
  name: string
  segment: string
  fleetSize: number
  region: string
  active: boolean
}

export const ACCOUNTS: Account[] = [
  {
    id: 'acc_transportes_bajio',
    name: 'Transportes del Bajío',
    segment: 'Carga general',
    fleetSize: 340,
    region: 'Bajío',
    active: true,
  },
  {
    id: 'acc_logistica_peninsular',
    name: 'Logística Peninsular',
    segment: 'Distribución refrigerada',
    fleetSize: 185,
    region: 'Sureste',
    active: true,
  },
  {
    id: 'acc_grupo_alimentario',
    name: 'Grupo Alimentario Norte',
    segment: 'Última milla',
    fleetSize: 512,
    region: 'Norte',
    active: true,
  },
  {
    id: 'acc_distribuidora_centro',
    name: 'Distribuidora Centro',
    segment: 'Reparto urbano',
    fleetSize: 96,
    region: 'Centro',
    active: true,
  },
  {
    id: 'acc_farmaceutica_azteca',
    name: 'Farmacéutica Azteca',
    segment: 'Transporte especializado',
    fleetSize: 41,
    region: 'Centro',
    // Contrato terminado: la cuenta no opera, pero su histórico se conserva.
    active: false,
  },
]

export function getAccount(id: string | null): Account | undefined {
  if (id === null) return undefined
  return ACCOUNTS.find((a) => a.id === id)
}

export function accountName(id: string | null): string {
  if (id === null) return 'Todas las cuentas'
  return getAccount(id)?.name ?? id
}

/** Total de unidades bajo gestión, para las tarjetas de resumen. */
export function totalFleetSize(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.fleetSize, 0)
}
