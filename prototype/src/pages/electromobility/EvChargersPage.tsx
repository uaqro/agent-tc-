import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import {
  EV_CHARGER_STATUS,
  EV_CHARGE_TYPE_LABEL,
  EV_REQUEST_PIPELINE,
  EV_REQUEST_STATUS,
  EV_RATES,
  evChargerRequests as seedRequests,
  evPrivateChargers,
  evStations,
  stationById,
} from '../../data/electromobility';
import type { EvChargerRequest, EvChargerRequestType, EvChargerStatus, EvConnector } from '../../types/electromobility';
import { businessNow } from '../../domain/demo/clock';
import { formatDateLong, formatMoney } from '../../utils/format';
import '../TablePage.css';
import '../../components/limits/PolicyDialog.css';
import './ev.css';

interface EvChargersPageProps {
  onNotice: (message: string) => void;
  /** The role reads chargers and requests but can't file one (ADR-TCP-001). */
  readOnly?: boolean;
}

const REQUEST_TYPE_LABEL: Record<EvChargerRequestType, string> = {
  integrate: 'Integrar cargador existente',
  install: 'Suministro e instalación',
};

const CONNECTORS: EvConnector[] = ['CCS2', 'Type2', 'CHAdeMO'];

let requestSequence = 7;

export function EvChargersPage({ onNotice, readOnly = false }: EvChargersPageProps) {
  const [requests, setRequests] = useState<EvChargerRequest[]>(seedRequests);
  const [creating, setCreating] = useState(false);

  const counts = evPrivateChargers.reduce<Record<EvChargerStatus, number>>(
    (current, charger) => ({ ...current, [charger.status]: current[charger.status] + 1 }),
    { available: 0, 'in-use': 0, 'out-of-service': 0 },
  );
  const open = requests.filter((request) => !['live', 'rejected', 'cancelled'].includes(request.status));
  const publicStations = evStations.filter((station) => station.network === 'public');

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="los cargadores y sus solicitudes" />}
      <dl className="table-page__summary">
        <div>
          <dt>Cargadores propios</dt>
          <dd>
            {evPrivateChargers.length}
            <span className="ev__dd-sub">{new Set(evPrivateChargers.map((charger) => charger.stationId)).size} sitios · red privada</span>
          </dd>
        </div>
        <div>
          <dt>Disponibles ahora</dt>
          <dd>
            {counts.available}
            <span className="ev__dd-sub">{counts['in-use']} en uso</span>
          </dd>
        </div>
        <div>
          <dt>Fuera de servicio</dt>
          <dd className={counts['out-of-service'] ? 'is-alert' : undefined}>{counts['out-of-service']}</dd>
        </div>
        <div>
          <dt>Solicitudes abiertas</dt>
          <dd>{open.length}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="ev-own-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="ev-own-title">
            Cargadores propios
          </h2>
          <p className="ev__hint">Cargan con tarifa eléctrica del sitio: más barato que la red pública y sin salir de la ruta.</p>
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Cargador</th>
                <th scope="col">Sitio</th>
                <th scope="col">Potencia · conector</th>
                <th scope="col">Costo por kWh</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {evPrivateChargers.map((charger) => {
                const site = stationById(charger.stationId)!;
                return (
                  <tr key={charger.id}>
                    <td>
                      <span className="table-page__main">{charger.name}</span>
                    </td>
                    <td>
                      <span className="table-page__main">{site.name}</span>
                      <span className="table-page__sub">{site.city}</span>
                    </td>
                    <td className="table-page__nowrap">
                      {charger.powerKw} kW · {charger.connector}
                    </td>
                    <td className="table-page__nowrap">{formatMoney(site.tariffPerKwh * (1 + EV_RATES.iva + EV_RATES.platformFee), true)}</td>
                    <td>
                      <span className={`chip ${EV_CHARGER_STATUS[charger.status].chip}`}>{EV_CHARGER_STATUS[charger.status].label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-page__card" aria-labelledby="ev-requests-title">
        <header className="table-page__head">
          <div>
            <h2 className="table-page__title" id="ev-requests-title">
              Solicitudes de cargadores
            </h2>
            <p className="ev__hint">Integrar un cargador que ya tienes o pedir que se suministre e instale. Opera hasta que la solicitud queda en operación.</p>
          </div>
          {!readOnly && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
              Nueva solicitud
            </button>
          )}
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Solicitud</th>
                <th scope="col">Ubicación</th>
                <th scope="col">Equipo</th>
                <th scope="col">Avance</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const stage = EV_REQUEST_PIPELINE.indexOf(request.status);
                const stopped = stage === -1;
                const meta = EV_REQUEST_STATUS[request.status];
                return (
                  <tr key={request.id}>
                    <td>
                      <span className="table-page__main">{request.id}</span>
                      <span className="table-page__sub">
                        {REQUEST_TYPE_LABEL[request.type]} · {formatDateLong(request.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className="table-page__main">{request.location}</span>
                      <span className="table-page__sub">
                        {request.address} · {request.contact}
                      </span>
                    </td>
                    <td>
                      <span className="table-page__main">
                        {request.units} × {request.powerKw} kW {request.connector}
                      </span>
                      <span className="table-page__sub">
                        {request.type === 'integrate'
                          ? `${request.existingBrand ?? 'Marca por confirmar'} · ${request.protocol ?? 'OCPP'}`
                          : request.needsCivilWork
                            ? 'Requiere obra civil'
                            : 'Sin obra civil'}
                      </span>
                    </td>
                    <td>
                      <div className={`ev-pipeline${stopped ? ' ev-pipeline--stopped' : ''}`} aria-hidden="true">
                        {EV_REQUEST_PIPELINE.map((step, index) => (
                          <span key={step} className={!stopped && index <= stage ? 'is-done' : undefined} />
                        ))}
                      </div>
                      <span className={`chip ${meta.chip}`}>{meta.label}</span>
                      {!stopped && (
                        <span className="table-page__sub">
                          Paso {stage + 1} de {EV_REQUEST_PIPELINE.length}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-page__card" aria-labelledby="ev-public-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="ev-public-title">
            Red pública con convenio
          </h2>
          <p className="ev__hint">Estaciones de operadores (CPO) donde la tarjeta de la flota autoriza recargas.</p>
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Estación</th>
                <th scope="col">Operador</th>
                <th scope="col">Carga</th>
                <th scope="col">Conectores</th>
                <th scope="col">Costo por kWh</th>
              </tr>
            </thead>
            <tbody>
              {publicStations.map((station) => (
                <tr key={station.id}>
                  <td>
                    <span className="table-page__main">{station.name}</span>
                    <span className="table-page__sub">{station.city}</span>
                  </td>
                  <td>{station.operator}</td>
                  <td className="table-page__nowrap">
                    {EV_CHARGE_TYPE_LABEL[station.chargeType]}
                    <span className="table-page__sub">hasta {station.maxPowerKw} kW</span>
                  </td>
                  <td>{station.connectors.join(', ')}</td>
                  <td className="table-page__nowrap">{formatMoney(station.tariffPerKwh * (1 + EV_RATES.iva + EV_RATES.platformFee), true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {creating && (
        <RequestDialog
          onClose={() => setCreating(false)}
          onSave={(request) => {
            setRequests((current) => [request, ...current]);
            setCreating(false);
            onNotice(`Solicitud ${request.id} enviada. El equipo de implementación la revisa y te contacta.`);
          }}
        />
      )}
    </div>
  );
}

function RequestDialog({ onClose, onSave }: { onClose: () => void; onSave: (request: EvChargerRequest) => void }) {
  const [type, setType] = useState<EvChargerRequestType>('install');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [units, setUnits] = useState(2);
  const [powerKw, setPowerKw] = useState(22);
  const [connector, setConnector] = useState<EvConnector>('Type2');
  const [needsCivilWork, setNeedsCivilWork] = useState(false);
  const [existingBrand, setExistingBrand] = useState('');
  const [protocol, setProtocol] = useState('OCPP 1.6J');
  const [desiredDate, setDesiredDate] = useState('');

  const valid = location.trim() && contact.trim() && /\S+@\S+\.\S+/.test(email) && units > 0 && powerKw > 0;

  const save = () =>
    onSave({
      id: `SOL-${String(++requestSequence).padStart(4, '0')}`,
      type,
      location: location.trim(),
      address: address.trim() || 'Dirección por confirmar',
      contact: contact.trim(),
      email: email.trim(),
      createdAt: new Date(businessNow()).toISOString().slice(0, 10),
      desiredDate: desiredDate || null,
      status: 'submitted',
      units,
      powerKw,
      connector,
      needsCivilWork: type === 'install' && needsCivilWork,
      ...(type === 'integrate' ? { existingBrand: existingBrand.trim() || undefined, protocol } : {}),
    });

  return (
    <Modal
      open
      title="Nueva solicitud de cargadores"
      subtitle="No crea un cargador operativo hasta completar la implementación"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={save}>
            Enviar solicitud
          </button>
        </>
      }
    >
      <p className="policy-form__label">Tipo de solicitud</p>
      <div className="policy-form__pills">
        {(Object.keys(REQUEST_TYPE_LABEL) as EvChargerRequestType[]).map((candidate) => (
          <button type="button" key={candidate} className={type === candidate ? 'is-active' : ''} aria-pressed={type === candidate} onClick={() => setType(candidate)}>
            {REQUEST_TYPE_LABEL[candidate]}
          </button>
        ))}
      </div>

      <div className="ev-form-row">
        <label className="policy-form__field">
          <span>Ubicación</span>
          <input value={location} placeholder="Ej. Cedis Tlalnepantla" onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label className="policy-form__field">
          <span>Dirección</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label className="policy-form__field">
          <span>Contacto</span>
          <input value={contact} onChange={(event) => setContact(event.target.value)} />
        </label>
        <label className="policy-form__field">
          <span>Correo del contacto</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
      </div>

      <div className="policy-form__fields policy-form__label--spaced">
        <label className="policy-form__field">
          <span>{type === 'integrate' ? 'Cargadores a integrar' : 'Cargadores requeridos'}</span>
          <input type="number" min={1} value={units} onChange={(event) => setUnits(Number(event.target.value))} />
        </label>
        <label className="policy-form__field">
          <span>Potencia por cargador (kW)</span>
          <input type="number" min={1} value={powerKw} onChange={(event) => setPowerKw(Number(event.target.value))} />
        </label>
        <label className="policy-form__field">
          <span>Conector</span>
          <select value={connector} onChange={(event) => setConnector(event.target.value as EvConnector)}>
            {CONNECTORS.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
      </div>

      {type === 'integrate' ? (
        <div className="ev-form-row">
          <label className="policy-form__field">
            <span>Marca y modelo del cargador</span>
            <input value={existingBrand} placeholder="Ej. ABB Terra 54" onChange={(event) => setExistingBrand(event.target.value)} />
          </label>
          <label className="policy-form__field">
            <span>Protocolo</span>
            <select value={protocol} onChange={(event) => setProtocol(event.target.value)}>
              <option>OCPP 1.6J</option>
              <option>OCPP 2.0.1</option>
              <option>Sin conectividad</option>
            </select>
          </label>
        </div>
      ) : (
        <label className="policy-form__switch policy-form__label--spaced">
          <input type="checkbox" checked={needsCivilWork} onChange={(event) => setNeedsCivilWork(event.target.checked)} />
          <span>El sitio necesita obra civil (canalización, acometida, tablero)</span>
        </label>
      )}

      <label className="policy-form__field policy-form__label--spaced">
        <span>Fecha deseada (opcional)</span>
        <input type="date" value={desiredDate} onChange={(event) => setDesiredDate(event.target.value)} />
      </label>
    </Modal>
  );
}
