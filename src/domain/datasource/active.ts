/**
 * La fuente activa, con la firma de `data/fleet-activity`.
 * ════════════════════════════════════════════════════════
 * En eOne este módulo delega en un registro que permite cambiar el mock por un
 * dataset cargado a mano. Ticket Car+ solo tiene el mock, así que aquí es una
 * reexportación: se conserva el módulo para que el código portado de eOne
 * (filtros, organigrama y, en las fases siguientes, consumos y reportes) siga
 * importando del mismo sitio.
 */
export {
  COST_CENTER_IDS,
  ROUTE_IDS,
  UNIT_GROUPS,
  buildAccountActivity,
  fleetDriversOf,
  fleetUnitsOf,
  startOfDay,
  todayUnits,
  unitDayRows,
} from '../data/fleet-activity'
