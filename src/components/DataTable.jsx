import { useEffect, useState } from 'react';
import { Spinner, EmptyState } from './UI';

/**
 * Generic admin table.
 * columns: [{ key, label, sortable, render(row), className }]
 * sort is "col" or "-col"; onSort(nextSort)
 */
export default function DataTable({ columns, rows, loading, sort, onSort, selectable, selected = [], onSelect, empty = 'Nothing here yet.', rowKey = 'id' }) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r[rowKey]));
  const toggleAll = () => onSelect(allSelected ? [] : rows.map((r) => r[rowKey]));
  const toggle = (id) => onSelect(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const sortIcon = (key) => {
    if (sort === key) return ' ▲';
    if (sort === `-${key}`) return ' ▼';
    return '';
  };

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {selectable && (
              <th className="col-check">
                <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} className={c.className} aria-sort={sort === c.key ? 'ascending' : sort === `-${c.key}` ? 'descending' : undefined}>
                {c.sortable ? (
                  <button type="button" className="th-sort" onClick={() => onSort(sort === c.key ? `-${c.key}` : c.key)}>
                    {c.label}{sortIcon(c.key)}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="table-loading"><Spinner /></td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)}><EmptyState title={empty} /></td></tr>
          )}
          {!loading && rows.map((row) => (
            <tr key={row[rowKey]} className={selected.includes(row[rowKey]) ? 'is-selected' : ''}>
              {selectable && (
                <td className="col-check">
                  <input type="checkbox" aria-label="Select row" checked={selected.includes(row[rowKey])} onChange={() => toggle(row[rowKey])} />
                </td>
              )}
              {columns.map((c) => (
                <td key={c.key} className={c.className} data-label={c.label}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) {
    return meta ? <div className="pager"><span className="pager-info">{meta.total} item{meta.total === 1 ? '' : 's'}</span></div> : null;
  }
  return (
    <div className="pager">
      <span className="pager-info">{meta.from}–{meta.to} of {meta.total}</span>
      <div className="pager-buttons">
        <button type="button" className="btn btn-sm btn-ghost" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>‹ Prev</button>
        <span className="pager-page">Page {meta.current_page} / {meta.last_page}</span>
        <button type="button" className="btn btn-sm btn-ghost" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>Next ›</button>
      </div>
    </div>
  );
}

/** Debounced search box */
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  const [v, setV] = useState(value || '');
  useEffect(() => setV(value || ''), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if ((value || '') !== v) onChange(v);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <input type="search" className="input search-input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} aria-label={placeholder} />
  );
}
