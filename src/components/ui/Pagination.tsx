import { useEffect, useMemo, useState } from 'react';
import { formatCount } from '../../utils/format';
import './Pagination.css';

/** Rows per page on the catalogue tables. */
export const PAGE_SIZE = 25;

/** Slices `rows` into pages and goes back to the first page whenever the rows change, e.g. after filtering. */
export function usePagination<T>(rows: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => setPage(0), [rows]);

  const pageRows = useMemo(() => rows.slice(page * pageSize, (page + 1) * pageSize), [rows, page, pageSize]);

  return { page: Math.min(page, pageCount - 1), pageCount, pageRows, setPage, total: rows.length, pageSize };
}

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  /** Plural noun of the rows, as in "1–25 de 512 vehículos". */
  noun: string;
  onPage: (page: number) => void;
}

export function Pagination({ page, pageCount, total, pageSize, noun, onPage }: PaginationProps) {
  if (total <= pageSize) return null;

  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="pagination" aria-label={`Páginas de ${noun}`}>
      <span className="pagination__range">
        {formatCount(first)}–{formatCount(last)} de {formatCount(total)} {noun}
      </span>
      <div className="pagination__controls">
        <button type="button" className="btn btn--secondary btn--sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <span className="pagination__page">
          Página {page + 1} de {pageCount}
        </span>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
