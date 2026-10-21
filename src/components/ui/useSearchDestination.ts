import { useEffect, useRef, useState } from 'react';
import type { SearchDestination } from '../../data/globalSearch';
import { PAGE_SIZE } from './Pagination';

export function useSearchDestination(
  destination: SearchDestination | undefined,
  rowIds: string[],
  page: number,
  setPage: (page: number) => void,
  clearFilters: () => void,
  onNotice: (message: string) => void,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<SearchDestination>();
  const handled = useRef<number>();
  const clearRef = useRef(clearFilters);
  const noticeRef = useRef(onNotice);
  clearRef.current = clearFilters;
  noticeRef.current = onNotice;

  useEffect(() => {
    if (!destination || handled.current === destination.requestId) return;
    handled.current = destination.requestId;
    clearRef.current();
    setPending(destination);
  }, [destination]);

  useEffect(() => {
    if (!pending) return;
    const index = rowIds.indexOf(pending.entityId);
    if (index < 0) {
      noticeRef.current('El resultado ya no está disponible en este listado.');
      setPending(undefined);
      return;
    }
    const targetPage = Math.floor(index / PAGE_SIZE);
    if (page !== targetPage) {
      setPage(targetPage);
      return;
    }
    const root = rootRef.current;
    const visibleIds = rowIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const tableRows = root?.querySelectorAll<HTMLTableRowElement>('tbody > tr') ?? [];
    tableRows.forEach((element, visibleIndex) => {
      if (element.dataset.entityId || !visibleIds[visibleIndex]) return;
      element.dataset.entityId = visibleIds[visibleIndex];
      element.tabIndex = -1;
    });
    const row = [...(root?.querySelectorAll<HTMLTableRowElement>('[data-entity-id]') ?? [])]
      .find((element) => element.dataset.entityId === pending.entityId);
    if (row) {
      row.focus();
      row.scrollIntoView({ block: 'center', inline: 'nearest' });
      setPending(undefined);
    }
  }, [pending, rowIds, page, setPage]);

  return rootRef;
}
