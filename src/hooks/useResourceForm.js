import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from './useToast';

/**
 * Load / edit / save one record.
 *  - toForm(apiData) maps the API resource into editable form state
 *  - toPayload(form) maps form state back to the request body
 * Returns { form, set, setForm, errors, loading, saving, loadError, dirty, save, record }.
 */
export default function useResourceForm({ endpoint, id, empty, toForm = (d) => d, toPayload = (f) => f }) {
  const isNew = !id || id === 'new';
  const [form, setForm] = useState(empty);
  const [record, setRecord] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isNew) {
      setForm(empty);
      setRecord(null);
      setLoading(false);
      return;
    }
    // just created and redirected to /:id — the save response already holds the record
    if (record && String(record.id) === String(id)) return;
    setLoading(true);
    api.get(`${endpoint}/${id}`)
      .then((res) => {
        setRecord(res.data);
        setForm(toForm(res.data));
        setDirty(false);
      })
      .catch(setLoadError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, id]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    setDirty(true);
  }, []);

  const save = useCallback(async (overrides = {}) => {
    setSaving(true);
    setErrors({});
    try {
      const body = toPayload({ ...form, ...overrides });
      const res = isNew ? await api.post(endpoint, body) : await api.put(`${endpoint}/${id}`, body);
      setRecord(res.data);
      setForm(toForm(res.data));
      setDirty(false);
      toast(res.message || 'Saved');
      return res.data;
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.status === 422 ? 'Please fix the highlighted fields.' : err.message, 'error');
      return null;
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isNew, endpoint, id]);

  return { form, set, setForm, errors, loading, saving, loadError, dirty, save, record, isNew };
}
