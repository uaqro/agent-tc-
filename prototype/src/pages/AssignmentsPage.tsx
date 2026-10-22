import { useEffect, useMemo, useState } from 'react';
import {
  BellIcon,
  DownloadIcon,
  PlusIcon,
  UploadIcon,
} from '../components/icons/Icons';
import { account, vehicles as seedVehicles } from '../data/dispersion';
import { unitById } from '../data/client';
import { networkStations } from '../data/stationNetworks';
import { formatCount, formatMoney } from '../utils/format';
import './AssignmentsPage.css';

type AssignmentAction = 'assign' | 'cut' | 'equalize';
type ActionDraft = { action: AssignmentAction | ''; amount: string; expiryDate: string | null; note: string };
type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
type ShortagePolicy = 'reject' | 'proportional' | 'smallest-first';
type EndCondition = 'never' | 'date' | 'iterations';
type ScheduleItem = { vehicleId: string; action: AssignmentAction; amount: number };
type ScheduleDraft = {
  name: string;
  frequency: Frequency;
  startDate: string;
  endCondition: EndCondition;
  endDate: string;
  iterations: string;
  shortagePolicy: ShortagePolicy;
  recipients: string;
  missingMonthDay: 'last-day' | 'skip';
  items: ScheduleItem[];
};
type ScheduledAssignment = ScheduleDraft & { id: string; runCount: number; lastRun?: string; status: 'active' | 'finished' };
type CouponDraftLine = { vehicleId: string; amount: string; quantity: string; maxUses: string };
type CouponToken = { id: string; vehicleId: string; amount: number; remaining: number; maxUses: number; uses: number };
type CouponBook = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  unassigned: number;
  tokens: CouponToken[];
  status: 'active' | 'closed';
};
type LimitLine = { vehicleId: string; limit: number; used: number };
type LimitGroup = { id: string; name: string; frequency: Frequency; lines: LimitLine[] };
type Folio = {
  id: string;
  code: string;
  vehicleId: string;
  amount: number;
  contact: string;
  stationIds: string[];
  startDate: string;
  endDate: string;
  status: 'active' | 'used' | 'expired';
  consumed?: number;
};
type BulkPreviewRow = {
  line: number;
  vehicleId: string;
  medium: string;
  plate: string;
  action: AssignmentAction | '';
  amount: number;
  applicationDate: string;
  note: string;
  status: 'valid' | 'invalid' | 'pending' | 'applied' | 'rejected';
  message: string;
};
type BulkBatch = { id: string; name: string; createdAt: string; rows: BulkPreviewRow[] };
type Activity = { id: string; date: string; source: string; detail: string; amount: number; note: string };

const TABS = [
  { id: 'individual', label: 'Individual' },
  { id: 'bulk', label: 'Carga masiva' },
  { id: 'scheduled', label: 'Programadas' },
  { id: 'coupons', label: 'Cupones · Nota vale' },
  { id: 'limits', label: 'Límites' },
  { id: 'folios', label: 'Folios de carga' },
] as const;
type TabId = typeof TABS[number]['id'];

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'daily', label: 'Diaria' },
  { id: 'weekly', label: 'Semanal · lunes' },
  { id: 'biweekly', label: 'Quincenal · días 1 y 15' },
  { id: 'monthly', label: 'Mensual' },
];
const ACTIONS: { id: AssignmentAction; label: string }[] = [
  { id: 'assign', label: 'Asignar' },
  { id: 'cut', label: 'Recortar' },
  { id: 'equalize', label: 'Igualar saldo' },
];
const shortageLabels: Record<ShortagePolicy, string> = {
  reject: 'Rechazar ejecución completa',
  proportional: 'Aplicar proporcionalmente',
  'smallest-first': 'Ejecutar de menor a mayor',
};
const currency = (amount: number) => formatMoney(amount);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const emptyActionDraft = (): ActionDraft => ({ action: '', amount: '', expiryDate: null, note: '' });
const emptyScheduleDraft = (): ScheduleDraft => ({
  name: '', frequency: 'weekly', startDate: today(), endCondition: 'never', endDate: '', iterations: '',
  shortagePolicy: 'reject', recipients: '', missingMonthDay: 'last-day',
  items: [{ vehicleId: seedVehicles[0]?.id ?? '', action: 'assign', amount: 1000 }],
});
const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

function vehicleName(vehicleId: string) {
  const unit = unitById(vehicleId);
  return unit ? `${unit.brand} ${unit.model}` : 'Unidad';
}

function actionLabel(action: AssignmentAction | '') {
  return ACTIONS.find((candidate) => candidate.id === action)?.label ?? 'Sin acción';
}

function calculateImpact(action: AssignmentAction, amount: number, current: number, global: number) {
  if (!Number.isFinite(amount) || amount < 0 || (action !== 'equalize' && amount === 0)) {
    return { error: 'Ingresa un monto mayor a cero.' };
  }
  if (action === 'cut' && amount > current) return { error: 'El saldo del medio de pago es insuficiente para el recorte.' };
  const movement = action === 'assign' ? amount : action === 'cut' ? -amount : amount - current;
  if (movement > 0 && movement > global) return { error: 'Saldo global insuficiente para esta acción.' };
  return { movement };
}

function parseCsvRow(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if ((char === ',' || char === ';' || char === '\t') && !quoted) { values.push(value.trim()); value = ''; }
    else value += char;
  }
  values.push(value.trim());
  return values;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nextScheduledDate(schedule: ScheduledAssignment) {
  const firstDate = new Date(`${schedule.startDate}T12:00:00`);
  const date = new Date(firstDate);
  for (let run = 0; run < schedule.runCount; run += 1) {
    if (schedule.frequency === 'daily') date.setDate(date.getDate() + 1);
    else if (schedule.frequency === 'weekly') {
      date.setDate(date.getDate() + 1);
      while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
    } else if (schedule.frequency === 'biweekly') {
      if (date.getDate() < 15) date.setDate(15);
      else { date.setDate(1); date.setMonth(date.getMonth() + 1); }
    } else {
      const targetDay = firstDate.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + 1);
      let lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
      while (targetDay > lastDay && schedule.missingMonthDay === 'skip') {
        date.setMonth(date.getMonth() + 1);
        lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
      }
      date.setDate(Math.min(targetDay, lastDay));
    }
  }
  return dateKey(date);
}

export function AssignmentsPage({ onNotice }: { onNotice: (message: string) => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('individual');
  const [globalBalance, setGlobalBalance] = useState(account.availableMXN);
  const [balances, setBalances] = useState<Record<string, number>>(() => Object.fromEntries(seedVehicles.map((vehicle) => [vehicle.id, vehicle.balanceMXN])));
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, ActionDraft>>(() => Object.fromEntries(seedVehicles.map((vehicle) => [vehicle.id, emptyActionDraft()])));
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(() => new Set());
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showObservation, setShowObservation] = useState(false);
  const [pendingActions, setPendingActions] = useState<{ id: string; plate: string; action: string; amount: number; date: string; note: string }[]>([]);
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkBatches, setBulkBatches] = useState<BulkBatch[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledAssignment[]>([]);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(emptyScheduleDraft);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [couponBooks, setCouponBooks] = useState<CouponBook[]>([]);
  const [couponFormOpen, setCouponFormOpen] = useState(false);
  const [couponName, setCouponName] = useState('');
  const [couponStart, setCouponStart] = useState(today());
  const [couponEnd, setCouponEnd] = useState(today());
  const [couponBudget, setCouponBudget] = useState('');
  const [couponLines, setCouponLines] = useState<CouponDraftLine[]>([{ vehicleId: seedVehicles[0]?.id ?? '', amount: '', quantity: '1', maxUses: '1' }]);
  const [couponRedemptions, setCouponRedemptions] = useState<Record<string, string>>({});
  const [limitGroups, setLimitGroups] = useState<LimitGroup[]>([]);
  const [limitFormOpen, setLimitFormOpen] = useState(false);
  const [limitName, setLimitName] = useState('');
  const [limitFrequency, setLimitFrequency] = useState<Frequency>('monthly');
  const [limitLines, setLimitLines] = useState<{ vehicleId: string; limit: string }[]>([{ vehicleId: seedVehicles[0]?.id ?? '', limit: '' }]);
  const [limitConsumptions, setLimitConsumptions] = useState<Record<string, string>>({});
  const [folios, setFolios] = useState<Folio[]>([]);
  const [folioAmount, setFolioAmount] = useState('');
  const [folioVehicleId, setFolioVehicleId] = useState(seedVehicles[0]?.id ?? '');
  const [folioContact, setFolioContact] = useState('');
  const [folioStartDate, setFolioStartDate] = useState(today());
  const [folioEndDate, setFolioEndDate] = useState(today());
  const [folioStationIds, setFolioStationIds] = useState<string[]>([]);
  const [folioUsage, setFolioUsage] = useState<Record<string, string>>({});
  const [stationQuery, setStationQuery] = useState('');

  const filteredVehicles = useMemo(() => seedVehicles.filter((vehicle) => {
    const query = vehicleQuery.trim().toLocaleLowerCase('es-MX');
    return !query || `${vehicle.plate} ${vehicle.device} ${vehicle.group} ${vehicleName(vehicle.id)}`.toLocaleLowerCase('es-MX').includes(query);
  }), [vehicleQuery]);
  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const displayPage = Math.min(currentPage, pageCount);
  const pageVehicles = filteredVehicles.slice((displayPage - 1) * pageSize, displayPage * pageSize);
  const firstVisibleRecord = filteredVehicles.length ? (displayPage - 1) * pageSize + 1 : 0;
  const lastVisibleRecord = Math.min(displayPage * pageSize, filteredVehicles.length);
  const selectedCount = selectedVehicles.size;
  const selectedActionCount = [...selectedVehicles].filter((id) => drafts[id]?.action && drafts[id]?.amount !== '').length;
  const totalCouponAllocated = couponLines.reduce((sum, line) => sum + (Number(line.amount) || 0) * (Number(line.quantity) || 0), 0);
  const availableStations = useMemo(() => networkStations.slice(0, 100).filter((station) =>
    `${station.name} ${station.city} ${station.state} ${station.brand}`.toLocaleLowerCase('es-MX').includes(stationQuery.trim().toLocaleLowerCase('es-MX')),
  ), [stationQuery]);

  useEffect(() => {
    const currentDate = today();
    const expiredBooks = couponBooks.filter((book) => book.status === 'active' && book.endDate < currentDate);
    const expiredFolios = folios.filter((folio) => folio.status === 'active' && folio.endDate < currentDate);
    if (!expiredBooks.length && !expiredFolios.length) return;
    const released = expiredBooks.reduce((sum, book) => sum + book.unassigned + book.tokens.reduce((tokenSum, token) => tokenSum + token.remaining, 0), 0) +
      expiredFolios.reduce((sum, folio) => sum + folio.amount, 0);
    setGlobalBalance((current) => current + released);
    setCouponBooks((current) => current.map((book) => expiredBooks.some((expired) => expired.id === book.id)
      ? { ...book, status: 'closed', unassigned: 0, tokens: book.tokens.map((token) => ({ ...token, remaining: 0 })) }
      : book));
    setFolios((current) => current.map((folio) => expiredFolios.some((expired) => expired.id === folio.id) ? { ...folio, status: 'expired' } : folio));
    onNotice(`${currency(released)} de cupones y folios vencidos regresaron al saldo global.`);
  }, [couponBooks, folios, onNotice]);

  const setDraftValue = (vehicleId: string, value: Partial<ActionDraft>) => setDrafts((current) => ({
    ...current,
    [vehicleId]: { ...(current[vehicleId] ?? emptyActionDraft()), ...value },
  }));

  const setActionDraftValue = (vehicleId: string, value: Partial<ActionDraft>) => {
    const nextDraft = { ...(drafts[vehicleId] ?? emptyActionDraft()), ...value };
    setDraftValue(vehicleId, value);
    if (nextDraft.action && nextDraft.amount !== '' && Number.isFinite(Number(nextDraft.amount)) && Number(nextDraft.amount) >= 0) {
      setSelectedVehicles((current) => new Set(current).add(vehicleId));
    }
  };

  const toggleVehicle = (vehicleId: string) => setSelectedVehicles((current) => {
    const next = new Set(current);
    if (next.has(vehicleId)) next.delete(vehicleId); else next.add(vehicleId);
    return next;
  });

  const applyActionRows = (rows: { vehicleId: string; action: AssignmentAction; amount: number; date: string; note?: string; expiryDate?: string | null }[]) => {
    let nextGlobal = globalBalance;
    const nextBalances = { ...balances };
    const succeeded: typeof rows = [];
    const rejected: string[] = [];
    const queued: typeof pendingActions = [];
    const currentDate = today();

    rows.forEach((row) => {
      const vehicle = seedVehicles.find((candidate) => candidate.id === row.vehicleId);
      if (!vehicle) { rejected.push('Medio de pago no encontrado.'); return; }
      if (row.date > currentDate) {
        queued.push({ id: newId('pend'), plate: vehicle.plate, action: actionLabel(row.action), amount: row.amount, date: row.date, note: row.note ?? '' });
        succeeded.push(row);
        return;
      }
      const currentBalance = nextBalances[row.vehicleId] ?? 0;
      const impact = calculateImpact(row.action, row.amount, currentBalance, nextGlobal);
      if ('error' in impact) { rejected.push(`${vehicle.plate}: ${impact.error}`); return; }
      nextBalances[row.vehicleId] = currentBalance + impact.movement;
      nextGlobal -= impact.movement;
      succeeded.push(row);
      setActivities((current) => [{
        id: newId('mov'), date: currentDate, source: actionLabel(row.action),
        detail: `${vehicle.plate} · ${vehicle.device}`, amount: -impact.movement, note: row.note ?? '',
      }, ...current]);
    });

    setGlobalBalance(nextGlobal);
    setBalances(nextBalances);
    setExpiryDates((current) => {
      let next = current;
      rows.forEach((row) => {
        if (!succeeded.includes(row) || row.expiryDate === undefined || row.expiryDate === null) return;
        if (next === current) next = { ...current };
        if (row.expiryDate) next[row.vehicleId] = row.expiryDate;
        else delete next[row.vehicleId];
      });
      return next;
    });
    if (queued.length) setPendingActions((current) => [...queued, ...current]);
    return { succeeded, rejected, queued };
  };

  const applyIndividual = () => {
    const rows = [...selectedVehicles].flatMap((vehicleId) => {
      const draft = drafts[vehicleId];
      if (!draft?.action || draft.amount === '') return [];
      return [{ vehicleId, action: draft.action, amount: Number(draft.amount), date: today(), expiryDate: draft.expiryDate, note: draft.note }];
    });
    if (!rows.length) { onNotice('Selecciona medios de pago e indica una acción y un monto.'); return; }
    const result = applyActionRows(rows);
    const succeededIds = new Set(result.succeeded.map((row) => row.vehicleId));
    setDrafts((current) => {
      const next = { ...current };
      succeededIds.forEach((vehicleId) => {
        next[vehicleId] = { ...next[vehicleId], action: '', amount: '', expiryDate: null, note: '' };
      });
      return next;
    });
    setSelectedVehicles((current) => {
      const next = new Set(current);
      succeededIds.forEach((vehicleId) => next.delete(vehicleId));
      return next;
    });
    if (result.rejected.length) onNotice(`${result.succeeded.length} acciones aplicadas o programadas; ${result.rejected.length} rechazadas. ${result.rejected[0]}`);
    else onNotice(`${result.succeeded.length} acciones aplicadas o programadas correctamente.`);
  };

  const selectAllVisible = (checked: boolean) => setSelectedVehicles((current) => {
    const next = new Set(current);
    pageVehicles.forEach((vehicle) => checked ? next.add(vehicle.id) : next.delete(vehicle.id));
    return next;
  });

  const downloadBulkTemplate = () => {
    const header = ['medio_pago', 'placa', 'accion', 'monto', 'fecha_aplicacion', 'observacion'];
    const rows = seedVehicles.map((vehicle) => [vehicle.device, vehicle.plate, '', '', '', '']);
    const csv = [header, ...rows].map((row) => row.map((value) => csvEscape(value)).join(',')).join('\r\n');
    const link = document.createElement('a');
    const href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.href = href;
    link.download = 'plantilla-asignaciones-compatible-excel.csv';
    link.click();
    URL.revokeObjectURL(href);
  };

  const readBulkFile = async (file?: File) => {
    if (!file) return;
    setBulkFileName(file.name);
    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim());
    const headers = parseCsvRow(lines[0] ?? '').map((header) => header.toLocaleLowerCase('es-MX').replace(/ /g, '_'));
    const indexFor = (name: string, fallback: number) => {
      const index = headers.indexOf(name);
      return index < 0 ? fallback : index;
    };
    const plateIndex = indexFor('placa', 1);
    const mediumIndex = indexFor('medio_pago', 0);
    const actionIndex = indexFor('accion', 2);
    const amountIndex = indexFor('monto', 3);
    const dateIndex = indexFor('fecha_aplicacion', 4);
    const noteIndex = indexFor('observacion', 5);
    const parsedRows = lines.slice(1).map((line, index): BulkPreviewRow => {
      const cells = parseCsvRow(line);
      const plate = (cells[plateIndex] ?? '').toLocaleUpperCase('es-MX');
      const medium = cells[mediumIndex] ?? '';
      const vehicle = seedVehicles.find((candidate) => candidate.plate.toLocaleUpperCase('es-MX') === plate || candidate.device === medium);
      const actionText = (cells[actionIndex] ?? '').toLocaleLowerCase('es-MX').trim();
      const action = actionText === 'asignar' || actionText === 'assign' ? 'assign'
        : actionText === 'recortar' || actionText === 'cut' ? 'cut'
          : actionText === 'igualar' || actionText === 'equalize' ? 'equalize' : '';
      const amount = Number((cells[amountIndex] ?? '').replace(/[$,\s]/g, ''));
      let message = '';
      let status: BulkPreviewRow['status'] = 'valid';
      if (!vehicle) { status = 'invalid'; message = 'Medio de pago o placa no encontrados.'; }
      else if (!action) { status = 'invalid'; message = 'Acción inválida: usar asignar, recortar o igualar.'; }
      else if (!Number.isFinite(amount) || amount < 0 || (action !== 'equalize' && amount === 0)) { status = 'invalid'; message = 'Monto inválido.'; }
      return {
        line: index + 2, vehicleId: vehicle?.id ?? '', medium, plate: vehicle?.plate ?? plate, action, amount,
        applicationDate: cells[dateIndex] || today(), note: cells[noteIndex] ?? '', status, message,
      };
    });
    const seenVehicles = new Set<string>();
    const rows = parsedRows.map((row) => {
      if (row.status !== 'valid' || !row.vehicleId) return row;
      if (seenVehicles.has(row.vehicleId)) return { ...row, status: 'invalid' as const, message: 'Medio duplicado: una acción por medio en cada carga.' };
      seenVehicles.add(row.vehicleId);
      return row;
    });
    setBulkPreview(rows);
    if (rows.length === 0) onNotice('El archivo no contiene filas para cargar.');
  };

  const applyBulkFile = () => {
    if (!bulkPreview.length) return;
    const validRows = bulkPreview.filter((row) => row.status === 'valid' && row.action).map((row) => ({
      vehicleId: row.vehicleId, action: row.action as AssignmentAction, amount: row.amount,
      date: row.applicationDate, note: row.note,
    }));
    const result = applyActionRows(validRows);
    const completedIds = new Set(result.succeeded.map((row) => row.vehicleId));
    let successSeen = 0;
    const updatedRows = bulkPreview.map((row) => {
      if (row.status !== 'valid') return row;
      if (completedIds.has(row.vehicleId)) {
        successSeen += 1;
        return { ...row, status: row.applicationDate > today() ? 'pending' as const : 'applied' as const, message: row.applicationDate > today() ? 'Aplicación programada.' : 'Aplicada.' };
      }
      const rejection = result.rejected.find((message) => message.startsWith(`${row.plate}:`)) ?? 'No fue posible ejecutar la fila.';
      return { ...row, status: 'rejected' as const, message: rejection };
    });
    const batch: BulkBatch = { id: newId('carga'), name: bulkFileName || 'Carga masiva', createdAt: today(), rows: updatedRows };
    setBulkPreview(updatedRows);
    setBulkBatches((current) => [batch, ...current]);
    onNotice(`Carga registrada: ${successSeen} filas aplicadas o programadas y ${updatedRows.filter((row) => row.status === 'invalid' || row.status === 'rejected').length} con error.`);
  };

  const beginScheduleEdit = (schedule?: ScheduledAssignment) => {
    if (!schedule) {
      setEditingScheduleId(null);
      setScheduleDraft(emptyScheduleDraft());
    } else {
      setEditingScheduleId(schedule.id);
      setScheduleDraft({
        name: schedule.name, frequency: schedule.frequency, startDate: schedule.startDate,
        endCondition: schedule.endCondition, endDate: schedule.endDate, iterations: schedule.iterations,
        shortagePolicy: schedule.shortagePolicy, recipients: schedule.recipients,
        missingMonthDay: schedule.missingMonthDay, items: schedule.items.map((item) => ({ ...item })),
      });
    }
    setScheduleFormOpen(true);
  };

  const saveSchedule = () => {
    if (!scheduleDraft.name.trim() || !scheduleDraft.items.length || scheduleDraft.items.some((item) => !item.vehicleId || item.amount < 0)) {
      onNotice('Completa el nombre y los medios, acciones y montos de la programación.'); return;
    }
    if (new Set(scheduleDraft.items.map((item) => item.vehicleId)).size !== scheduleDraft.items.length) {
      onNotice('Cada medio de pago solo puede aparecer una vez por programación.'); return;
    }
    const existing = scheduled.find((item) => item.id === editingScheduleId);
    const updated: ScheduledAssignment = { ...scheduleDraft, id: editingScheduleId ?? newId('prog'), runCount: existing?.runCount ?? 0, status: 'active', lastRun: existing?.lastRun };
    setScheduled((current) => editingScheduleId ? current.map((item) => item.id === editingScheduleId ? updated : item) : [updated, ...current]);
    setScheduleFormOpen(false);
    setEditingScheduleId(null);
    onNotice(editingScheduleId ? 'Programación actualizada.' : 'Programación creada. Se ejecutará en cada fecha configurada.');
  };

  const runSchedule = (schedule: ScheduledAssignment) => {
    const orderedItems = schedule.shortagePolicy === 'smallest-first'
      ? [...schedule.items].sort((left, right) => left.amount - right.amount)
      : schedule.items;
    const totalRequired = orderedItems.reduce((sum, item) => {
      if (item.action === 'cut') return sum;
      const current = balances[item.vehicleId] ?? 0;
      return sum + Math.max(0, item.action === 'equalize' ? item.amount - current : item.amount);
    }, 0);
    if (schedule.shortagePolicy === 'reject' && totalRequired > globalBalance) {
      onNotice('Ejecución rechazada: el saldo global no cubre el grupo completo.'); return;
    }
    const factor = schedule.shortagePolicy === 'proportional' && totalRequired > globalBalance ? globalBalance / totalRequired : 1;
    const rows = orderedItems.map((item) => ({
      vehicleId: item.vehicleId, action: item.action,
      amount: factor < 1 && item.action !== 'cut' ? Math.round(item.amount * factor * 100) / 100 : item.amount,
      date: today(),
    }));
    const result = applyActionRows(rows);
    if (!result.succeeded.length) { onNotice(result.rejected[0] ?? 'No fue posible ejecutar la programación.'); return; }
    setScheduled((current) => current.map((item) => item.id === schedule.id ? {
      ...item, runCount: item.runCount + 1, lastRun: today(),
      status: item.endCondition === 'iterations' && item.runCount + 1 >= Number(item.iterations) ? 'finished' : item.status,
    } : item));
    onNotice(`Ejecución registrada: ${result.succeeded.length} medios procesados${result.rejected.length ? ` y ${result.rejected.length} rechazados` : ''}.`);
  };

  const createCouponBook = () => {
    const budget = Number(couponBudget);
    if (!couponName.trim() || !Number.isFinite(budget) || budget <= 0 || couponEnd < couponStart) {
      onNotice('Completa el nombre, el periodo y el monto del talonario.'); return;
    }
    if (totalCouponAllocated > budget) { onNotice('La suma de cupones excede el monto del talonario.'); return; }
    if (budget > globalBalance) { onNotice('Saldo global insuficiente para crear el talonario.'); return; }
    const tokens = couponLines.flatMap((line) => {
      const amount = Number(line.amount);
      const quantity = Math.max(0, Math.floor(Number(line.quantity)));
      const uses = Math.max(1, Math.floor(Number(line.maxUses)));
      return Array.from({ length: quantity }, () => ({ id: newId('cupon'), vehicleId: line.vehicleId, amount, remaining: amount, maxUses: uses, uses: 0 }));
    }).filter((token) => token.amount > 0 && token.vehicleId);
    setGlobalBalance((current) => current - budget);
    setCouponBooks((current) => [{
      id: newId('talonario'), name: couponName.trim(), startDate: couponStart, endDate: couponEnd,
      budget, unassigned: budget - totalCouponAllocated, tokens, status: 'active',
    }, ...current]);
    setCouponName(''); setCouponBudget(''); setCouponLines([{ vehicleId: seedVehicles[0]?.id ?? '', amount: '', quantity: '1', maxUses: '1' }]);
    setCouponFormOpen(false);
    onNotice(`Talonario creado; ${currency(budget)} descontados del saldo global.`);
  };

  const redeemCoupon = (bookId: string, tokenId: string) => {
    const amount = Number(couponRedemptions[tokenId]);
    let error = '';
    setCouponBooks((current) => current.map((book) => {
      if (book.id !== bookId) return book;
      return { ...book, tokens: book.tokens.map((token) => {
        if (token.id !== tokenId) return token;
        if (!Number.isFinite(amount) || amount <= 0 || amount > token.remaining) error = 'El consumo debe ser mayor que cero y no exceder el saldo del cupón.';
        else if (token.uses >= token.maxUses) error = 'El cupón alcanzó su número máximo de usos.';
        return error ? token : { ...token, remaining: token.remaining - amount, uses: token.uses + 1 };
      }) };
    }));
    if (error) { onNotice(error); return; }
    setCouponRedemptions((current) => ({ ...current, [tokenId]: '' }));
    onNotice('Consumo parcial del cupón registrado.');
  };

  const closeCouponBook = (book: CouponBook) => {
    if (book.status === 'closed') return;
    const remainder = book.unassigned + book.tokens.reduce((sum, token) => sum + token.remaining, 0);
    setGlobalBalance((current) => current + remainder);
    setCouponBooks((current) => current.map((candidate) => candidate.id === book.id ? { ...candidate, status: 'closed', unassigned: 0, tokens: candidate.tokens.map((token) => ({ ...token, remaining: 0 })) } : candidate));
    onNotice(`${currency(remainder)} de remanente devueltos al saldo global.`);
  };

  const saveLimitGroup = () => {
    const lines = limitLines.map((line) => ({ vehicleId: line.vehicleId, limit: Number(line.limit), used: 0 }));
    if (!limitName.trim() || !lines.length || lines.some((line) => !line.vehicleId || !Number.isFinite(line.limit) || line.limit <= 0)) {
      onNotice('Completa el nombre del grupo y un límite válido por medio de pago.'); return;
    }
    if (new Set(lines.map((line) => line.vehicleId)).size !== lines.length) { onNotice('Cada medio de pago solo puede agregarse una vez al grupo.'); return; }
    setLimitGroups((current) => [{ id: newId('limite'), name: limitName.trim(), frequency: limitFrequency, lines }, ...current]);
    setLimitName(''); setLimitLines([{ vehicleId: seedVehicles[0]?.id ?? '', limit: '' }]); setLimitFormOpen(false);
    onNotice('Grupo de límites creado. El saldo global no se debita hasta consumir.');
  };

  const registerLimitConsumption = (groupId: string, vehicleId: string) => {
    const key = `${groupId}:${vehicleId}`;
    const amount = Number(limitConsumptions[key]);
    let error = '';
    setLimitGroups((current) => current.map((group) => group.id !== groupId ? group : {
      ...group,
      lines: group.lines.map((line) => {
        if (line.vehicleId !== vehicleId) return line;
        if (!Number.isFinite(amount) || amount <= 0) error = 'Ingresa un consumo mayor a cero.';
        else if (line.used + amount > line.limit) error = 'La transacción excede el límite disponible del periodo.';
        return error ? line : { ...line, used: line.used + amount };
      }),
    }));
    if (error) { onNotice(error); return; }
    setLimitConsumptions((current) => ({ ...current, [key]: '' }));
    onNotice('Consumo registrado; el saldo global no cambia por la asignación del límite.');
  };

  const createFolio = () => {
    const amount = Number(folioAmount);
    if (!folioVehicleId || !Number.isFinite(amount) || amount <= 0 || !folioContact.trim() || folioStationIds.length === 0 || folioEndDate < folioStartDate) {
      onNotice('Completa medio de pago, monto, contacto, estaciones y periodo del folio.'); return;
    }
    if (amount > globalBalance) { onNotice('Saldo global insuficiente para autorizar este folio.'); return; }
    const folio: Folio = {
      id: newId('folio'), code: `FC-${Date.now().toString().slice(-7)}`, vehicleId: folioVehicleId,
      amount, contact: folioContact.trim(), stationIds: [...folioStationIds], startDate: folioStartDate,
      endDate: folioEndDate, status: 'active',
    };
    setGlobalBalance((current) => current - amount);
    setFolios((current) => [folio, ...current]);
    setFolioAmount(''); setFolioContact(''); setFolioStationIds([]);
    onNotice(`Folio ${folio.code} creado; el monto autorizado quedó reservado del saldo global.`);
  };

  const redeemFolio = (folio: Folio) => {
    const consumed = Number(folioUsage[folio.id]);
    if (!Number.isFinite(consumed) || consumed <= 0 || consumed > folio.amount) { onNotice('El consumo debe ser mayor a cero y no exceder el monto autorizado.'); return; }
    const released = folio.amount - consumed;
    setGlobalBalance((current) => current + released);
    setFolios((current) => current.map((item) => item.id === folio.id ? { ...item, status: 'used', consumed } : item));
    setFolioUsage((current) => ({ ...current, [folio.id]: '' }));
    onNotice(`Folio utilizado. ${currency(released)} de saldo no ejercido regresaron al global.`);
  };

  const expireFolio = (folio: Folio) => {
    if (folio.status !== 'active' || folio.endDate >= today()) return;
    setGlobalBalance((current) => current + folio.amount);
    setFolios((current) => current.map((item) => item.id === folio.id ? { ...item, status: 'expired' } : item));
    onNotice(`Folio ${folio.code} vencido; el monto autorizado regresó al saldo global.`);
  };

  const tabContent = () => {
    if (activeTab === 'individual') return <section className="assignments__section" aria-label="Asignación individual">
      <header className="assignments__section-head">
        <div><h2>Asignación individual</h2><p>Selecciona medios de pago y define una acción por medio.</p></div>
        <button type="button" className="btn btn--primary" disabled={selectedActionCount === 0} onClick={applyIndividual}>Aplicar {formatCount(selectedActionCount)} acciones</button>
      </header>
      <div className="assignments__toolbar">
        <label className="assignments__search"><span className="visually-hidden">Buscar por vehículo, placa o medio de pago</span><input value={vehicleQuery} onChange={(event) => { setVehicleQuery(event.target.value); setCurrentPage(1); }} placeholder="Buscar vehículo, placa o medio de pago" /></label>
        <span>{formatCount(selectedCount)} seleccionados</span>
        {pendingActions.length > 0 && <span className="assignments__pending">{formatCount(pendingActions.length)} acciones futuras pendientes</span>}
        <button type="button" className="btn btn--ghost btn--sm assignments__observation-toggle" aria-pressed={showObservation} onClick={() => setShowObservation((visible) => !visible)}>{showObservation ? 'Ocultar observación' : 'Agregar observación'}</button>
      </div>
      <div className={`assignments__table-wrap assignments__individual-table${showObservation ? ' has-observation' : ''}`}>
        <table className="assignments__table assignments__table--individual">
          <thead><tr>
            <th><input type="checkbox" aria-label="Seleccionar medios de esta página" checked={pageVehicles.length > 0 && pageVehicles.every((vehicle) => selectedVehicles.has(vehicle.id))} onChange={(event) => selectAllVisible(event.target.checked)} /></th>
            <th>Vehículo</th><th>Placa</th><th>Medio de pago</th><th>Saldo actual</th><th>Acción</th><th>Monto / objetivo</th><th>Caducidad del saldo</th>{showObservation && <th>Observación</th>}
          </tr></thead>
          <tbody>{pageVehicles.map((vehicle) => {
            const draft = drafts[vehicle.id] ?? emptyActionDraft();
            const expiryDate = draft.expiryDate ?? expiryDates[vehicle.id] ?? '';
            return <tr key={vehicle.id}>
              <td><input type="checkbox" aria-label={`Seleccionar ${vehicle.plate}`} checked={selectedVehicles.has(vehicle.id)} onChange={() => toggleVehicle(vehicle.id)} /></td>
              <td><strong>{vehicleName(vehicle.id)}</strong><small>{vehicle.group}</small></td>
              <td>{vehicle.plate}</td><td>{vehicle.device}</td><td className="assignments__current-balance">{currency(balances[vehicle.id] ?? vehicle.balanceMXN)}</td>
              <td><select aria-label={`Acción para ${vehicle.plate}`} value={draft.action} onChange={(event) => setActionDraftValue(vehicle.id, { action: event.target.value as AssignmentAction | '' })}>
                <option value="">Sin acción</option>{ACTIONS.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}
              </select></td>
              <td><input aria-label={`Monto para ${vehicle.plate}`} type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setActionDraftValue(vehicle.id, { amount: event.target.value })} placeholder={draft.action === 'equalize' ? currency(balances[vehicle.id] ?? vehicle.balanceMXN) : '0.00'} /></td>
              <td><div className="assignments__expiry-cell"><input aria-label={`Caducidad para ${vehicle.plate}`} type="date" min={today()} value={expiryDate} onChange={(event) => setDraftValue(vehicle.id, { expiryDate: event.target.value })} /><small>{expiryDate ? `Vence ${expiryDate}` : 'Sin fecha'}</small></div></td>
              {showObservation && <td><input aria-label={`Observación para ${vehicle.plate}`} maxLength={120} value={draft.note} onChange={(event) => setDraftValue(vehicle.id, { note: event.target.value })} placeholder="Opcional" /></td>}
            </tr>;
          })}</tbody>
        </table>
        {!filteredVehicles.length && <p className="assignments__empty">No hay medios de pago que coincidan con la búsqueda.</p>}
      </div>
      <div className="assignments__pagination" aria-label="Paginación de medios de pago">
        <span>{firstVisibleRecord}–{lastVisibleRecord} de {formatCount(filteredVehicles.length)}</span>
        <label>Registros por página<select aria-label="Registros por página" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <button type="button" className="btn btn--ghost btn--sm" aria-label="Página anterior" disabled={displayPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Anterior</button>
        <span>Página {displayPage} de {pageCount}</span>
        <button type="button" className="btn btn--ghost btn--sm" aria-label="Página siguiente" disabled={displayPage >= pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}>Siguiente</button>
      </div>
      <p className="assignments__hint">Los fondos insuficientes se rechazan por medio de pago; las demás acciones seleccionadas se procesan.</p>
      {pendingActions.length > 0 && <section className="assignments__subsection"><h3>Acciones futuras</h3><div className="assignments__table-wrap"><table className="assignments__table"><thead><tr><th>Fecha de aplicación</th><th>Placa</th><th>Acción</th><th>Monto / objetivo</th><th>Observación</th><th>Estado</th></tr></thead><tbody>{pendingActions.map((item) => <tr key={item.id}><td>{item.date}</td><td>{item.plate}</td><td>{item.action}</td><td>{currency(item.amount)}</td><td>{item.note || '—'}</td><td>Pendiente</td></tr>)}</tbody></table></div></section>}
    </section>;

    if (activeTab === 'bulk') return <section className="assignments__section" aria-label="Carga masiva">
      <header className="assignments__section-head">
        <div><h2>Asignación por carga masiva</h2><p>La plantilla incluye todos los medios de pago activos. El archivo CSV abre y se edita en Excel.</p></div>
        <button type="button" className="btn btn--secondary" onClick={downloadBulkTemplate}><DownloadIcon width={16} height={16} />Descargar plantilla</button>
      </header>
      <div className="assignments__upload-row">
        <label className="btn btn--secondary assignments__file-button"><UploadIcon width={16} height={16} />Seleccionar CSV<input type="file" accept=".csv,text/csv" onChange={(event) => void readBulkFile(event.target.files?.[0])} /></label>
        <span>{bulkFileName || 'Acciones soportadas: asignar, recortar e igualar.'}</span>
        <button type="button" className="btn btn--primary" disabled={!bulkPreview.some((row) => row.status === 'valid')} onClick={applyBulkFile}>Procesar filas válidas</button>
      </div>
      {bulkPreview.length > 0 && <>
        <div className="assignments__table-wrap"><table className="assignments__table">
          <thead><tr><th>Fila</th><th>Placa</th><th>Medio de pago</th><th>Acción</th><th>Monto</th><th>Aplicación</th><th>Resultado</th></tr></thead>
          <tbody>{bulkPreview.map((row) => <tr key={row.line}>
            <td>{row.line}</td><td>{row.plate}</td><td>{row.medium}</td><td>{actionLabel(row.action)}</td><td>{currency(row.amount)}</td><td>{row.applicationDate}</td>
            <td><span className={`assignments__status assignments__status--${row.status}`}>{row.message || 'Validada'}</span></td>
          </tr>)}</tbody>
        </table></div>
        <p className="assignments__hint">Las filas con error no detienen las filas válidas. Las fechas futuras quedan pendientes para seguimiento.</p>
      </>}
      <section className="assignments__subsection">
        <h3>Seguimiento de cargas</h3>
        {bulkBatches.length ? <div className="assignments__table-wrap"><table className="assignments__table">
          <thead><tr><th>Archivo</th><th>Fecha</th><th>Filas</th><th>Aplicadas</th><th>Pendientes</th><th>Con error</th></tr></thead>
          <tbody>{bulkBatches.map((batch) => <tr key={batch.id}>
            <td>{batch.name}</td><td>{batch.createdAt}</td><td>{batch.rows.length}</td>
            <td>{batch.rows.filter((row) => row.status === 'applied').length}</td><td>{batch.rows.filter((row) => row.status === 'pending').length}</td>
            <td>{batch.rows.filter((row) => row.status === 'invalid' || row.status === 'rejected').length}</td>
          </tr>)}</tbody>
        </table></div> : <p className="assignments__empty">Aún no hay cargas procesadas en esta sesión.</p>}
      </section>
    </section>;

    if (activeTab === 'scheduled') return <section className="assignments__section" aria-label="Asignaciones programadas">
      <header className="assignments__section-head">
        <div><h2>Asignaciones programadas</h2><p>Vista previa de próximas ejecuciones. El saldo se debita a las 00:01 de cada fecha de aplicación.</p></div>
        <button type="button" className="btn btn--primary" onClick={() => beginScheduleEdit()}><PlusIcon width={16} height={16} />Nueva programación</button>
      </header>
      {scheduleFormOpen && <div className="assignments__form-panel">
        <div className="assignments__form-head"><h3>{editingScheduleId ? 'Editar programación' : 'Nueva programación'}</h3><button type="button" className="btn btn--ghost btn--sm" onClick={() => { setScheduleFormOpen(false); setEditingScheduleId(null); }}>Cerrar</button></div>
        <div className="assignments__form-grid">
          <label>Nombre<input value={scheduleDraft.name} onChange={(event) => setScheduleDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Reposición regional" /></label>
          <label>Frecuencia<select value={scheduleDraft.frequency} onChange={(event) => setScheduleDraft((current) => ({ ...current, frequency: event.target.value as Frequency }))}>{FREQUENCIES.map((frequency) => <option key={frequency.id} value={frequency.id}>{frequency.label}</option>)}</select></label>
          <label>Primera ejecución<input type="date" min={today()} value={scheduleDraft.startDate} onChange={(event) => setScheduleDraft((current) => ({ ...current, startDate: event.target.value }))} /></label>
          <label>Finalización<select value={scheduleDraft.endCondition} onChange={(event) => setScheduleDraft((current) => ({ ...current, endCondition: event.target.value as EndCondition }))}><option value="never">Sin fecha de finalización</option><option value="date">Fecha final</option><option value="iterations">Número de ejecuciones</option></select></label>
          {scheduleDraft.endCondition === 'date' && <label>Fecha final<input type="date" min={scheduleDraft.startDate} value={scheduleDraft.endDate} onChange={(event) => setScheduleDraft((current) => ({ ...current, endDate: event.target.value }))} /></label>}
          {scheduleDraft.endCondition === 'iterations' && <label>Completar después de<input type="number" min="1" value={scheduleDraft.iterations} onChange={(event) => setScheduleDraft((current) => ({ ...current, iterations: event.target.value }))} /><small>Ejecuciones</small></label>}
          {scheduleDraft.frequency === 'monthly' && <label>Si el día no existe<select value={scheduleDraft.missingMonthDay} onChange={(event) => setScheduleDraft((current) => ({ ...current, missingMonthDay: event.target.value as ScheduleDraft['missingMonthDay'] }))}><option value="last-day">Ejecutar el último día del mes</option><option value="skip">Omitir ese mes</option></select></label>}
          <label>Saldo insuficiente<select value={scheduleDraft.shortagePolicy} onChange={(event) => setScheduleDraft((current) => ({ ...current, shortagePolicy: event.target.value as ShortagePolicy }))}>{Object.entries(shortageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="assignments__form-wide">Notificar a usuarios<input value={scheduleDraft.recipients} onChange={(event) => setScheduleDraft((current) => ({ ...current, recipients: event.target.value }))} placeholder="Correos separados por coma" /><small>Se notifican ejecuciones exitosas, parciales y rechazadas.</small></label>
        </div>
        <div className="assignments__subsection">
          <div className="assignments__form-head"><h4>Medios de pago del grupo</h4><button type="button" className="btn btn--ghost btn--sm" onClick={() => setScheduleDraft((current) => ({ ...current, items: [...current.items, { vehicleId: seedVehicles[0]?.id ?? '', action: 'assign', amount: 0 }] }))}><PlusIcon width={14} height={14} />Agregar medio</button></div>
          {scheduleDraft.items.map((item, index) => <div className="assignments__line-editor" key={`${index}-${item.vehicleId}`}>
            <select aria-label={`Medio de pago programado ${index + 1}`} value={item.vehicleId} onChange={(event) => setScheduleDraft((current) => ({ ...current, items: current.items.map((candidate, row) => row === index ? { ...candidate, vehicleId: event.target.value } : candidate) }))}>{seedVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.device}</option>)}</select>
            <select aria-label={`Acción programada ${index + 1}`} value={item.action} onChange={(event) => setScheduleDraft((current) => ({ ...current, items: current.items.map((candidate, row) => row === index ? { ...candidate, action: event.target.value as AssignmentAction } : candidate) }))}>{ACTIONS.map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}</select>
            <input aria-label={`Monto programado ${index + 1}`} type="number" min="0" value={item.amount} onChange={(event) => setScheduleDraft((current) => ({ ...current, items: current.items.map((candidate, row) => row === index ? { ...candidate, amount: Number(event.target.value) } : candidate) }))} />
            <button type="button" className="btn btn--ghost btn--sm" disabled={scheduleDraft.items.length === 1} onClick={() => setScheduleDraft((current) => ({ ...current, items: current.items.filter((_, row) => row !== index) }))}>Quitar</button>
          </div>)}
        </div>
        <div className="assignments__form-actions"><button type="button" className="btn btn--primary" onClick={saveSchedule}>{editingScheduleId ? 'Guardar cambios' : 'Crear programación'}</button></div>
      </div>}
      <div className="assignments__table-wrap"><table className="assignments__table">
        <thead><tr><th>Grupo</th><th>Frecuencia</th><th>Medios</th><th>Próxima ejecución</th><th>Fin</th><th>Saldo insuficiente</th><th>Ejecuciones</th><th>Acciones</th></tr></thead>
        <tbody>{scheduled.map((schedule) => <tr key={schedule.id}>
          <td><strong>{schedule.name}</strong><small>{schedule.recipients || 'Sin destinatarios configurados'}</small></td>
          <td>{FREQUENCIES.find((item) => item.id === schedule.frequency)?.label}</td><td>{schedule.items.length}</td><td>{nextScheduledDate(schedule)}</td>
          <td>{schedule.endCondition === 'never' ? 'Sin fecha' : schedule.endCondition === 'date' ? schedule.endDate : `${schedule.iterations} ejecuciones`}</td>
          <td>{shortageLabels[schedule.shortagePolicy]}</td><td>{schedule.runCount}{schedule.lastRun ? ` · última ${schedule.lastRun}` : ''}</td>
          <td className="assignments__actions"><button type="button" className="btn btn--ghost btn--sm" onClick={() => beginScheduleEdit(schedule)}>Editar</button><button type="button" className="btn btn--secondary btn--sm" disabled={schedule.status === 'finished' || (schedule.endCondition === 'date' && nextScheduledDate(schedule) > schedule.endDate)} onClick={() => runSchedule(schedule)}>Simular ejecución</button></td>
        </tr>)}</tbody>
      </table></div>
      {!scheduled.length && <p className="assignments__empty">No hay programaciones. Crea un grupo para visualizar sus próximas ejecuciones.</p>}
    </section>;

    if (activeTab === 'coupons') return <section className="assignments__section" aria-label="Cupones Nota Vale">
      <header className="assignments__section-head">
        <div><h2>Cupones · Nota vale</h2><p>El presupuesto del talonario se descuenta al crearlo; el remanente vuelve al saldo global al cerrar.</p></div>
        <button type="button" className="btn btn--primary" onClick={() => setCouponFormOpen((open) => !open)}><PlusIcon width={16} height={16} />Nuevo talonario</button>
      </header>
      {couponFormOpen && <div className="assignments__form-panel">
        <h3>Configurar talonario</h3>
        <div className="assignments__form-grid">
          <label>Nombre<input value={couponName} onChange={(event) => setCouponName(event.target.value)} placeholder="Ej. Cupones de ruta norte" /></label>
          <label>Inicio<input type="date" min={today()} value={couponStart} onChange={(event) => setCouponStart(event.target.value)} /></label>
          <label>Fin<input type="date" min={couponStart} value={couponEnd} onChange={(event) => setCouponEnd(event.target.value)} /></label>
          <label>Monto total del talonario<input type="number" min="0" value={couponBudget} onChange={(event) => setCouponBudget(event.target.value)} /></label>
        </div>
        <div className="assignments__subsection">
          <div className="assignments__form-head"><h4>Cupones por medio de pago</h4><button type="button" className="btn btn--ghost btn--sm" onClick={() => setCouponLines((current) => [...current, { vehicleId: seedVehicles[0]?.id ?? '', amount: '', quantity: '1', maxUses: '1' }])}><PlusIcon width={14} height={14} />Agregar medio</button></div>
          {couponLines.map((line, index) => <div className="assignments__line-editor" key={`${index}-${line.vehicleId}`}>
            <select aria-label={`Medio de cupón ${index + 1}`} value={line.vehicleId} onChange={(event) => setCouponLines((current) => current.map((item, row) => row === index ? { ...item, vehicleId: event.target.value } : item))}>{seedVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.device}</option>)}</select>
            <label>Valor por cupón<input type="number" min="0" value={line.amount} onChange={(event) => setCouponLines((current) => current.map((item, row) => row === index ? { ...item, amount: event.target.value } : item))} /></label>
            <label>Cantidad<input type="number" min="1" value={line.quantity} onChange={(event) => setCouponLines((current) => current.map((item, row) => row === index ? { ...item, quantity: event.target.value } : item))} /></label>
            <label>Usos por cupón<input type="number" min="1" value={line.maxUses} onChange={(event) => setCouponLines((current) => current.map((item, row) => row === index ? { ...item, maxUses: event.target.value } : item))} /></label>
            <button type="button" className="btn btn--ghost btn--sm" disabled={couponLines.length === 1} onClick={() => setCouponLines((current) => current.filter((_, row) => row !== index))}>Quitar</button>
          </div>)}
          <p className="assignments__hint">Asignado a cupones: {currency(totalCouponAllocated)} de {currency(Number(couponBudget) || 0)}.</p>
        </div>
        <div className="assignments__form-actions"><button type="button" className="btn btn--primary" onClick={createCouponBook}>Crear talonario</button></div>
      </div>}
      {couponBooks.map((book) => <section className="assignments__subsection" key={book.id}>
        <header className="assignments__section-head"><div><h3>{book.name}</h3><p>{book.startDate} a {book.endDate} · Presupuesto {currency(book.budget)} · Remanente sin asignar {currency(book.unassigned)}</p></div>
          <button type="button" className="btn btn--secondary btn--sm" disabled={book.status === 'closed'} onClick={() => closeCouponBook(book)}>Cerrar talonario y devolver remanente</button></header>
        <div className="assignments__table-wrap"><table className="assignments__table"><thead><tr><th>Cupón</th><th>Placa</th><th>Medio</th><th>Disponible</th><th>Usos</th><th>Registrar consumo parcial</th></tr></thead>
          <tbody>{book.tokens.map((token) => <tr key={token.id}><td>{token.id.slice(-8)}</td><td>{seedVehicles.find((vehicle) => vehicle.id === token.vehicleId)?.plate}</td><td>{seedVehicles.find((vehicle) => vehicle.id === token.vehicleId)?.device}</td><td>{currency(token.remaining)} de {currency(token.amount)}</td><td>{token.uses}/{token.maxUses}</td>
            <td className="assignments__inline-action"><input aria-label={`Consumo del cupón ${token.id}`} type="number" min="0" max={token.remaining} value={couponRedemptions[token.id] ?? ''} onChange={(event) => setCouponRedemptions((current) => ({ ...current, [token.id]: event.target.value }))} /><button type="button" className="btn btn--secondary btn--sm" disabled={book.status === 'closed' || token.remaining <= 0 || token.uses >= token.maxUses} onClick={() => redeemCoupon(book.id, token.id)}>Registrar uso</button></td>
          </tr>)}</tbody>
        </table></div>
      </section>)}
      {!couponBooks.length && !couponFormOpen && <p className="assignments__empty">No hay talonarios configurados.</p>}
    </section>;

    if (activeTab === 'limits') return <section className="assignments__section" aria-label="Asignación por límites">
      <header className="assignments__section-head"><div><h2>Asignación de límites</h2><p>El límite se consume con cada transacción; la asignación no descuenta saldo global.</p></div><button type="button" className="btn btn--primary" onClick={() => setLimitFormOpen((open) => !open)}><PlusIcon width={16} height={16} />Nuevo grupo de límites</button></header>
      {limitFormOpen && <div className="assignments__form-panel"><h3>Configurar grupo</h3>
        <div className="assignments__form-grid"><label>Nombre del grupo<input value={limitName} onChange={(event) => setLimitName(event.target.value)} placeholder="Ej. Límite mensual de ruta" /></label><label>Frecuencia<select value={limitFrequency} onChange={(event) => setLimitFrequency(event.target.value as Frequency)}>{FREQUENCIES.map((frequency) => <option key={frequency.id} value={frequency.id}>{frequency.label}</option>)}</select></label></div>
        <div className="assignments__subsection"><div className="assignments__form-head"><h4>Medios y límites por periodo</h4><button type="button" className="btn btn--ghost btn--sm" onClick={() => setLimitLines((current) => [...current, { vehicleId: seedVehicles[0]?.id ?? '', limit: '' }])}><PlusIcon width={14} height={14} />Agregar medio</button></div>
          {limitLines.map((line, index) => <div className="assignments__line-editor" key={`${index}-${line.vehicleId}`}><select aria-label={`Medio de límite ${index + 1}`} value={line.vehicleId} onChange={(event) => setLimitLines((current) => current.map((item, row) => row === index ? { ...item, vehicleId: event.target.value } : item))}>{seedVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.device}</option>)}</select><label>Límite del periodo<input type="number" min="0" value={line.limit} onChange={(event) => setLimitLines((current) => current.map((item, row) => row === index ? { ...item, limit: event.target.value } : item))} /></label><button type="button" className="btn btn--ghost btn--sm" disabled={limitLines.length === 1} onClick={() => setLimitLines((current) => current.filter((_, row) => row !== index))}>Quitar</button></div>)}
        </div><div className="assignments__form-actions"><button type="button" className="btn btn--primary" onClick={saveLimitGroup}>Crear grupo</button></div>
      </div>}
      {limitGroups.map((group) => <section className="assignments__subsection" key={group.id}><header className="assignments__section-head"><div><h3>{group.name}</h3><p>{FREQUENCIES.find((item) => item.id === group.frequency)?.label} · Reinicio al iniciar el siguiente periodo calendario</p></div><button type="button" className="btn btn--ghost btn--sm" onClick={() => setLimitGroups((current) => current.map((item) => item.id === group.id ? { ...item, lines: item.lines.map((line) => ({ ...line, used: 0 })) } : item))}>Simular nuevo periodo</button></header>
        <div className="assignments__table-wrap"><table className="assignments__table"><thead><tr><th>Placa</th><th>Medio de pago</th><th>Límite del periodo</th><th>Consumido</th><th>Disponible</th><th>Registrar transacción de prueba</th></tr></thead><tbody>
          {group.lines.map((line) => { const vehicle = seedVehicles.find((candidate) => candidate.id === line.vehicleId); const key = `${group.id}:${line.vehicleId}`; return <tr key={line.vehicleId}><td>{vehicle?.plate}</td><td>{vehicle?.device}</td><td>{currency(line.limit)}</td><td>{currency(line.used)}</td><td>{currency(line.limit - line.used)}</td><td className="assignments__inline-action"><input aria-label={`Consumo de ${vehicle?.plate}`} type="number" min="0" value={limitConsumptions[key] ?? ''} onChange={(event) => setLimitConsumptions((current) => ({ ...current, [key]: event.target.value }))} /><button type="button" className="btn btn--secondary btn--sm" onClick={() => registerLimitConsumption(group.id, line.vehicleId)}>Registrar</button></td></tr>; })}
        </tbody></table></div>
      </section>)}
      {!limitGroups.length && !limitFormOpen && <p className="assignments__empty">No hay grupos de límites configurados.</p>}
    </section>;

    return <section className="assignments__section" aria-label="Folios de carga">
      <header className="assignments__section-head"><div><h2>Folios de carga</h2><p>Autorización excepcional de un solo uso para un medio y estaciones específicas.</p></div></header>
      <div className="assignments__form-panel"><h3>Crear folio excepcional</h3>
        <div className="assignments__form-grid">
          <label>Medio de pago<select value={folioVehicleId} onChange={(event) => setFolioVehicleId(event.target.value)}>{seedVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.device}</option>)}</select></label>
          <label>Monto autorizado<input type="number" min="0" value={folioAmount} onChange={(event) => setFolioAmount(event.target.value)} /></label>
          <label>Teléfono o correo del usuario<input value={folioContact} onChange={(event) => setFolioContact(event.target.value)} placeholder="usuario@empresa.com o teléfono" /></label>
          <label>Vigente desde<input type="date" min={today()} value={folioStartDate} onChange={(event) => setFolioStartDate(event.target.value)} /></label>
          <label>Vigente hasta<input type="date" min={folioStartDate} value={folioEndDate} onChange={(event) => setFolioEndDate(event.target.value)} /></label>
        </div>
        <div className="assignments__station-picker"><div><h4>Estaciones autorizadas</h4><p>{folioStationIds.length} seleccionadas</p></div><input value={stationQuery} onChange={(event) => setStationQuery(event.target.value)} placeholder="Buscar estación o ciudad" />
          <div className="assignments__station-list">{availableStations.slice(0, 24).map((station) => <label key={station.id}><input type="checkbox" checked={folioStationIds.includes(station.id)} onChange={() => setFolioStationIds((current) => current.includes(station.id) ? current.filter((id) => id !== station.id) : [...current, station.id])} /><span>{station.name}<small>{station.city}, {station.state}</small></span></label>)}</div>
        </div>
        <div className="assignments__form-actions"><button type="button" className="btn btn--primary" onClick={createFolio}>Generar folio y compartir</button></div>
      </div>
      <section className="assignments__subsection"><h3>Folios emitidos</h3>
        {folios.length ? <div className="assignments__table-wrap"><table className="assignments__table"><thead><tr><th>Folio</th><th>Medio de pago</th><th>Monto</th><th>Vigencia</th><th>Estaciones</th><th>Estado / consumo</th><th>Compartir</th></tr></thead><tbody>
          {folios.map((folio) => { const vehicle = seedVehicles.find((candidate) => candidate.id === folio.vehicleId); const shareBody = encodeURIComponent(`Folio de carga ${folio.code} · ${currency(folio.amount)} · válido hasta ${folio.endDate}`); const shareHref = folio.contact.includes('@') ? `mailto:${folio.contact}?subject=Folio de carga&body=${shareBody}` : `sms:${folio.contact}?body=${shareBody}`; return <tr key={folio.id}>
            <td><strong>{folio.code}</strong></td><td>{vehicle?.plate} · {vehicle?.device}</td><td>{currency(folio.amount)}</td><td>{folio.startDate} a {folio.endDate}</td><td>{folio.stationIds.length}</td>
            <td>{folio.status === 'active' ? <div className="assignments__inline-action"><input aria-label={`Monto consumido del folio ${folio.code}`} type="number" min="0" max={folio.amount} placeholder="Monto usado" value={folioUsage[folio.id] ?? ''} onChange={(event) => setFolioUsage((current) => ({ ...current, [folio.id]: event.target.value }))} /><button type="button" className="btn btn--secondary btn--sm" onClick={() => redeemFolio(folio)}>Registrar uso</button><button type="button" className="btn btn--ghost btn--sm" disabled={folio.endDate >= today()} onClick={() => expireFolio(folio)}>Vencer</button></div> : `${folio.status === 'used' ? 'Utilizado' : 'Vencido'}${folio.consumed ? ` · ${currency(folio.consumed)}` : ''}`}</td>
            <td>{folio.status === 'active' ? <a className="btn btn--ghost btn--sm" href={shareHref}><BellIcon width={14} height={14} />Enviar</a> : '—'}</td>
          </tr>; })}
        </tbody></table></div> : <p className="assignments__empty">No hay folios activos o emitidos.</p>}
      </section>
    </section>;
  };

  return <div className="assignments">
    <section className="assignments__balance" aria-label="Saldo de la cuenta global">
      <div className="assignments__balance-primary"><span>Saldo global disponible</span><strong>{currency(globalBalance)}</strong><small>{account.name}</small></div>
      <div className="assignments__balance-metric"><span>Medios de pago</span><strong>{formatCount(seedVehicles.length)}</strong></div>
      <div className="assignments__balance-metric"><span>Programaciones activas</span><strong>{formatCount(scheduled.filter((item) => item.status === 'active').length)}</strong></div>
      <div className="assignments__balance-metric"><span>Acciones futuras</span><strong>{formatCount(pendingActions.length)}</strong></div>
    </section>
    <div className="assignments__tabs" role="tablist" aria-label="Tipos de asignación">
      {TABS.map((tab) => <button key={tab.id} type="button" role="tab" id={`assignment-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`assignment-panel-${tab.id}`} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
    </div>
    <div role="tabpanel" id={`assignment-panel-${activeTab}`} aria-labelledby={`assignment-tab-${activeTab}`} className="assignments__panel">{tabContent()}</div>
    {activities.length > 0 && <details className="assignments__activity"><summary>Movimientos recientes · {activities.length}</summary><div className="assignments__table-wrap"><table className="assignments__table"><thead><tr><th>Fecha</th><th>Origen</th><th>Medio de pago</th><th>Observación</th><th>Impacto al saldo global</th></tr></thead><tbody>{activities.slice(0, 10).map((activity) => <tr key={activity.id}><td>{activity.date}</td><td>{activity.source}</td><td>{activity.detail}</td><td>{activity.note || '—'}</td><td className={activity.amount < 0 ? 'is-debit' : 'is-credit'}>{activity.amount < 0 ? '−' : '+'}{currency(Math.abs(activity.amount))}</td></tr>)}</tbody></table></div></details>}
  </div>;
}