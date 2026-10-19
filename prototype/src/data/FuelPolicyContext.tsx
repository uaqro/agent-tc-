import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { LimitPolicy, UnitAssignment } from '../types/limits';
import { limitPolicies, unitAssignments } from './limits';
import { networkStations, seedStationNetworks, type StationNetwork } from './stationNetworks';

const STORAGE_KEY = 'tc-plus-fuel-policies-v1';
const stationIds = new Set(networkStations.map((station) => station.id));

interface FuelState {
  version: 1;
  policies: LimitPolicy[];
  assignments: UnitAssignment[];
  networks: StationNetwork[];
}

interface FuelPolicyContextValue {
  policies: LimitPolicy[];
  assignments: UnitAssignment[];
  networks: StationNetwork[];
  setPolicies: Dispatch<SetStateAction<LimitPolicy[]>>;
  setAssignments: Dispatch<SetStateAction<UnitAssignment[]>>;
  saveNetwork: (network: StationNetwork) => string | null;
  cancelNetwork: (id: string) => string | null;
  storageError: boolean;
}

function loadState(): FuelState {
  const fallback: FuelState = { version: 1, policies: limitPolicies, assignments: unitAssignments, networks: seedStationNetworks };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    const candidate = JSON.parse(stored) as FuelState;
    if (candidate.version !== 1 || !Array.isArray(candidate.policies) || !Array.isArray(candidate.assignments) || !Array.isArray(candidate.networks)) return fallback;
    if (!candidate.networks.every((network) => typeof network.id === 'string' && typeof network.name === 'string' &&
      ['allow', 'block'].includes(network.mode) && Array.isArray(network.stationIds) && network.stationIds.every((id) => stationIds.has(id)) &&
      Array.isArray(network.voucherNotes))) return fallback;
    if (!candidate.policies.every((policy) => typeof policy.id === 'string' && typeof policy.name === 'string' &&
      Array.isArray(policy.groupIds) && (policy.stationSubnetId === null || candidate.networks.some((network) => network.id === policy.stationSubnetId)))) return fallback;
    if (!candidate.assignments.every((assignment) => typeof assignment.vehicleId === 'string' &&
      (assignment.policyId === null || candidate.policies.some((policy) => policy.id === assignment.policyId)))) return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}

const FuelPolicyContext = createContext<FuelPolicyContextValue | null>(null);

export function FuelPolicyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadState);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);

  const setPolicies: Dispatch<SetStateAction<LimitPolicy[]>> = (update) => setState((current) => ({
    ...current, policies: typeof update === 'function' ? update(current.policies) : update,
  }));
  const setAssignments: Dispatch<SetStateAction<UnitAssignment[]>> = (update) => setState((current) => ({
    ...current, assignments: typeof update === 'function' ? update(current.assignments) : update,
  }));

  const saveNetwork = (network: StationNetwork): string | null => {
    const name = network.name.trim();
    if (!name || name.length > 50) return 'Ingresa un nombre de entre 1 y 50 caracteres.';
    if (state.networks.some((candidate) => candidate.id !== network.id && candidate.name.trim().toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX'))) return 'Ya existe una red con ese nombre.';
    if (!network.stationIds.length || network.stationIds.some((id) => !stationIds.has(id))) return 'Selecciona al menos una estación del catálogo.';
    const saved = { ...network, name, stationIds: [...new Set(network.stationIds)] };
    setState((current) => ({ ...current, networks: current.networks.some((candidate) => candidate.id === saved.id)
      ? current.networks.map((candidate) => candidate.id === saved.id ? saved : candidate) : [saved, ...current.networks] }));
    return null;
  };

  const cancelNetwork = (id: string): string | null => {
    const network = state.networks.find((candidate) => candidate.id === id);
    if (!network) return 'La red ya no está disponible.';
    if (network.voucherNotes.length || state.policies.some((policy) => policy.stationSubnetId === id)) return 'La red está asociada a una política o Nota Vales y no se puede cancelar.';
    setState((current) => ({ ...current, networks: current.networks.filter((candidate) => candidate.id !== id) }));
    return null;
  };

  return <FuelPolicyContext.Provider value={{ ...state, setPolicies, setAssignments, saveNetwork, cancelNetwork, storageError }}>
    {children}
  </FuelPolicyContext.Provider>;
}

export function useFuelPolicies() {
  const context = useContext(FuelPolicyContext);
  if (!context) throw new Error('FuelPolicyProvider no está disponible.');
  return context;
}