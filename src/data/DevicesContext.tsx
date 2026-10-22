import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { EvCard } from '../types/electromobility';
import type { TollTag } from '../types/toll';
import { evCards } from './electromobility';
import { paymentMedia, type PaymentMedium } from './fleet';
import { tollTags } from './toll';

/**
 * Every device a unit can carry, whatever the product: fuel cards, tags and virtual cards, toll TAGs, and charging
 * cards. Flota owns them, so Flota · Vehículos and Flota · Medios de pago read and change the same lists.
 */
interface DevicesContextValue {
  fuelMedia: PaymentMedium[];
  tollTags: TollTag[];
  evCards: EvCard[];
  setFuelMedia: Dispatch<SetStateAction<PaymentMedium[]>>;
  setTollTags: Dispatch<SetStateAction<TollTag[]>>;
  setEvCards: Dispatch<SetStateAction<EvCard[]>>;
}

const DevicesContext = createContext<DevicesContextValue | null>(null);

/** Seeds from the session scope when it mounts; the app remounts it when the scope changes. */
export function DevicesProvider({ children }: { children: ReactNode }) {
  const [fuelMedia, setFuelMedia] = useState<PaymentMedium[]>(paymentMedia);
  const [tolls, setTollTags] = useState<TollTag[]>(tollTags);
  const [cards, setEvCards] = useState<EvCard[]>(evCards);

  return (
    <DevicesContext.Provider value={{ fuelMedia, tollTags: tolls, evCards: cards, setFuelMedia, setTollTags, setEvCards }}>
      {children}
    </DevicesContext.Provider>
  );
}

export function useDevices(): DevicesContextValue {
  const value = useContext(DevicesContext);
  if (!value) throw new Error('useDevices must be used inside DevicesProvider');
  return value;
}
