import { useMemo, useState } from 'react';
import { AccountBar } from '../components/dispersion/AccountBar';
import { AttentionList, type AttentionAction } from '../components/dispersion/AttentionList';
import { ActivitySection, type ActivityTab } from '../components/dispersion/ActivitySection';
import { BulkUploadDialog } from '../components/dispersion/BulkUploadDialog';
import { ReceiptDialog } from '../components/dispersion/ReceiptDialog';
import { RequestsPanel } from '../components/dispersion/RequestsPanel';
import { RuleBuilderDialog } from '../components/dispersion/RuleBuilderDialog';
import { RulesSection } from '../components/dispersion/RulesSection';
import { SimulationDialog } from '../components/dispersion/SimulationDialog';
import {
  account,
  attentionItems as seedAttention,
  autoconsumoUnits,
  retiredUnits,
  buildSimulation,
  fundingRules as seedRules,
  pastReceipts,
  vehicles as seedVehicles,
} from '../data/dispersion';
import type { AttentionItem, BulkRow, FundingRule, Receipt, RunSimulation, Vehicle } from '../types/dispersion';
import { formatCount, formatMoney, parseDate } from '../utils/format';
import { ApiCoverageBanner } from '../components/api/ApiCoverage';
import './DispersionPage.css';

interface DispersionPageProps {
  onNotice: (message: string) => void;
}

let folioSequence = 212;
const nextFolio = () => `DIS-2026-10-${String(++folioSequence).padStart(4, '0')}`;

export function DispersionPage({ onNotice }: DispersionPageProps) {
  const [rules, setRules] = useState<FundingRule[]>(seedRules);
  const [attention, setAttention] = useState<AttentionItem[]>(seedAttention);
  const [vehicles, setVehicles] = useState<Vehicle[]>(seedVehicles);
  const [availableMXN, setAvailableMXN] = useState(account.availableMXN);
  const [receipts, setReceipts] = useState<Receipt[]>(pastReceipts);
  const [simulation, setSimulation] = useState<{ data: RunSimulation; mode: 'review' | 'run' } | null>(null);
  const [openReceipt, setOpenReceipt] = useState<Receipt | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [activityTab, setActivityTab] = useState<ActivityTab>('history');

  const scheduledPayments = useMemo(
    () =>
      rules
        .filter((rule) => rule.status !== 'paused')
        .sort((a, b) => {
          if (!a.nextRun) return 1;
          if (!b.nextRun) return -1;
          return parseDate(a.nextRun).getTime() - parseDate(b.nextRun).getTime();
        }),
    [rules],
  );

  const committedMXN = useMemo(
    () => scheduledPayments.reduce((sum, rule) => sum + rule.projectedMXN, 0),
    [scheduledPayments],
  );

  const balanceRequests = useMemo(() => attention.filter((item) => item.kind === 'balance-request'), [attention]);
  const exceptions = useMemo(() => attention.filter((item) => item.kind !== 'balance-request'), [attention]);

  const sortedReceipts = useMemo(
    () => [...receipts].sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()),
    [receipts],
  );

  const addReceipt = (receipt: Receipt) => setReceipts((current) => [receipt, ...current]);

  const adjustVehicle = (vehicleId: string, deltaMXN: number) =>
    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, balanceMXN: vehicle.balanceMXN + deltaMXN } : vehicle,
      ),
    );

  const toggleStatus = (rule: FundingRule) => {
    setRules((current) =>
      current.map((candidate) =>
        candidate.id === rule.id
          ? {
              ...candidate,
              status: candidate.status === 'paused' ? 'active' : 'paused',
              statusNote: candidate.status === 'paused' ? undefined : 'Pausada manualmente',
              approved: false,
            }
          : candidate,
      ),
    );
    onNotice(rule.status === 'paused' ? `Regla reactivada: ${rule.name}.` : `Regla pausada: ${rule.name}.`);
  };

  const confirmSimulation = (data: RunSimulation) => {
    if (simulation?.mode === 'review') {
      setRules((current) =>
        current.map((rule) => (rule.id === data.rule.id ? { ...rule, approved: true, status: 'active' } : rule)),
      );
      setSimulation(null);
      onNotice(`Corrida aprobada: ${data.rule.name}. Se ejecutará sin intervención.`);
      return;
    }

    const receipt: Receipt = {
      folio: nextFolio(),
      kind: 'rule',
      issuedAt: new Date().toISOString(),
      user: account.user,
      sourceLabel: data.rule.name,
      scopeLabel: `${data.rule.scopeLabel} · ${data.unitsAffected} unidades`,
      units: data.unitsAffected,
      totalMXN: data.totalMXN,
      lines: data.sample,
    };

    setAvailableMXN((current) => current - data.totalMXN);
    addReceipt(receipt);
    setSimulation(null);
    setOpenReceipt(receipt);
    onNotice(`Corrida ejecutada: ${formatMoney(data.totalMXN)} en ${data.unitsAffected} unidades.`);
  };

  const resolveAttention = (item: AttentionItem, action: AttentionAction) => {
    const vehicle = vehicles.find((candidate) => candidate.id === item.vehicleId);
    if (!vehicle) return;

    if (action.kind === 'review') {
      setAttention((current) => current.filter((candidate) => candidate.id !== item.id));
      onNotice(`${vehicle.plate} se excluye de la próxima corrida para revisión.`);
      return;
    }

    const isCut = action.kind === 'cut';
    const receipt: Receipt = {
      folio: nextFolio(),
      kind: isCut ? 'cut' : 'one-off',
      issuedAt: new Date().toISOString(),
      user: account.user,
      sourceLabel: isCut ? 'Recorte de saldo' : 'Dispersión puntual · excepción',
      scopeLabel: `${vehicle.plate} · ${vehicle.driver}`,
      units: 1,
      totalMXN: isCut ? -item.amountMXN : item.amountMXN,
      lines: [{ plate: vehicle.plate, driver: vehicle.driver, amountMXN: isCut ? -item.amountMXN : item.amountMXN }],
    };

    adjustVehicle(vehicle.id, isCut ? -item.amountMXN : item.amountMXN);
    setAvailableMXN((current) => current + (isCut ? item.amountMXN : -item.amountMXN));
    setAttention((current) => current.filter((candidate) => candidate.id !== item.id));
    addReceipt(receipt);
    onNotice(
      isCut
        ? `Saldo recortado de ${vehicle.plate}: ${formatMoney(item.amountMXN)} regresa a la cuenta.`
        : `${formatMoney(item.amountMXN)} enviados a ${vehicle.plate}.`,
    );
  };

  const sendQuickTopUp = (vehicle: Vehicle, amountMXN: number): Receipt => {
    const receipt: Receipt = {
      folio: nextFolio(),
      kind: 'one-off',
      issuedAt: new Date().toISOString(),
      user: account.user,
      sourceLabel: 'Dispersión puntual',
      scopeLabel: `${vehicle.plate} · ${vehicle.driver}`,
      units: 1,
      totalMXN: amountMXN,
      lines: [{ plate: vehicle.plate, driver: vehicle.driver, amountMXN }],
    };

    adjustVehicle(vehicle.id, amountMXN);
    setAvailableMXN((current) => current - amountMXN);
    setAttention((current) => current.filter((item) => item.vehicleId !== vehicle.id || item.kind !== 'zero-balance'));
    addReceipt(receipt);
    onNotice(`${formatMoney(amountMXN)} enviados a ${vehicle.plate}.`);
    return receipt;
  };

  const applyBulk = (rows: BulkRow[], fileName: string) => {
    const total = rows.reduce((sum, row) => sum + row.amountMXN, 0);
    const byPlate = new Map(vehicles.map((vehicle) => [vehicle.plate, vehicle.id]));

    setVehicles((current) =>
      current.map((vehicle) => {
        const row = rows.find((candidate) => candidate.plate === vehicle.plate);
        return row ? { ...vehicle, balanceMXN: vehicle.balanceMXN + row.amountMXN } : vehicle;
      }),
    );
    setAttention((current) =>
      current.filter((item) => !rows.some((row) => byPlate.get(row.plate) === item.vehicleId)),
    );
    setAvailableMXN((current) => current - total);

    const receipt: Receipt = {
      folio: nextFolio(),
      kind: 'bulk',
      issuedAt: new Date().toISOString(),
      user: account.user,
      sourceLabel: 'Carga masiva desde archivo',
      scopeLabel: `${fileName} · ${rows.length} unidades`,
      units: rows.length,
      totalMXN: total,
      lines: rows.map((row) => ({ plate: row.plate, driver: row.driver, amountMXN: row.amountMXN })),
    };

    addReceipt(receipt);
    setBulkOpen(false);
    setOpenReceipt(receipt);
    onNotice(`Dispersión masiva aplicada: ${formatMoney(total)} en ${rows.length} unidades.`);
  };

  return (
    <div className="dispersion">
      <ApiCoverageBanner page="dispersion" />

      <AccountBar
        accountName={account.name}
        availableMXN={availableMXN}
        committedMXN={committedMXN}
        onViewScheduled={() => setActivityTab('scheduled')}
      />

      <p className="dispersion__note" role="note">
        Saldos muestra las {formatCount(vehicles.length)} unidades TicketCar+ de alta. Del padrón de{' '}
        {formatCount(vehicles.length + autoconsumoUnits + retiredUnits)}, {formatCount(autoconsumoUnits)} son de Autoconsumo y no usan
        saldo prepagado (su consumo aparece en Resumen y Reportes) y {formatCount(retiredUnits)} están dadas de baja.
      </p>

      <ActivitySection
        receipts={sortedReceipts}
        scheduled={scheduledPayments}
        activeTab={activityTab}
        onTabChange={setActivityTab}
        onOpenReceipt={setOpenReceipt}
        onReviewPayment={(rule) => setSimulation({ data: buildSimulation(rule), mode: 'review' })}
        onRunPayment={(rule) => setSimulation({ data: buildSimulation(rule), mode: 'run' })}
      />

      <AttentionList
        items={exceptions}
        vehicles={vehicles}
        headerSlot={
          <RequestsPanel
            requests={balanceRequests}
            vehicles={vehicles}
            availableMXN={availableMXN}
            onApprove={(item) => resolveAttention(item, { label: '', kind: 'fund' })}
            onReject={(item) => {
              setAttention((current) => current.filter((candidate) => candidate.id !== item.id));
              onNotice('Solicitud de saldo rechazada. Se notificó al conductor.');
            }}
            onSend={sendQuickTopUp}
            onViewReceipt={setOpenReceipt}
          />
        }
        onResolve={resolveAttention}
        onDismiss={(item) => {
          setAttention((current) => current.filter((candidate) => candidate.id !== item.id));
          onNotice('Excepción pospuesta para la siguiente revisión.');
        }}
      />

      <RulesSection
        rules={rules}
        onSimulate={(rule) => setSimulation({ data: buildSimulation(rule), mode: 'review' })}
        onToggleStatus={toggleStatus}
        onCreate={() => setBuilderOpen(true)}
        onBulkUpload={() => setBulkOpen(true)}
        onEdit={(rule) => onNotice(`Editando los parámetros de ${rule.name}.`)}
      />

      <RuleBuilderDialog
        open={builderOpen}
        vehicles={vehicles}
        onClose={() => setBuilderOpen(false)}
        onCreate={(rule) => {
          setRules((current) => [rule, ...current]);
          setBuilderOpen(false);
          onNotice(`Automatización creada: ${rule.name}.`);
        }}
      />

      <BulkUploadDialog
        open={bulkOpen}
        vehicles={vehicles}
        availableMXN={availableMXN}
        onClose={() => setBulkOpen(false)}
        onApply={applyBulk}
      />

      <SimulationDialog
        open={simulation !== null}
        mode={simulation?.mode ?? 'review'}
        simulation={simulation?.data ?? null}
        onClose={() => setSimulation(null)}
        onConfirm={confirmSimulation}
      />

      <ReceiptDialog
        open={openReceipt !== null}
        receipt={openReceipt}
        onClose={() => setOpenReceipt(null)}
        onShare={(receipt) => onNotice(`Comprobante ${receipt.folio} compartido con finanzas.`)}
      />
    </div>
  );
}
