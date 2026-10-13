import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

/**
 * Server-side table state (search, filters, sort, page) kept in the URL so links and the
 * back button work. Returns rows, pagination meta and helpers.
 */
export default function useList(endpoint, defaults = {}) {
  const [search, setSearch] = useSearchParams();
  const [state, setState] = useState({ rows: [], meta: null, loading: true, error: null });
  const params = { ...defaults, ...Object.fromEntries(search.entries()) };
  const key = endpoint + '?' + new URLSearchParams(params).toString();

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return api.get(endpoint, params)
      .then((res) => setState({ rows: res.data, meta: res.meta || null, loading: false, error: null }))
      .catch((error) => setState({ rows: [], meta: null, loading: false, error }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = useCallback((updates) => {
    const next = new URLSearchParams(search);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, v);
    });
    if (!('page' in updates)) next.delete('page');
    setSearch(next);
  }, [search, setSearch]);

  return { ...state, params, setParam, reload: load };
}
