import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { PageHeader, Card, Toggle, Spinner, ErrorBox } from '../../components/UI';

/** Header navigation (Home · About Us · Designer · Latest News · Contact Us). */
export default function MenuPage() {
  const [items, setItems] = useState(null);
  const [pages, setPages] = useState([]);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/admin/menu').then((r) => setItems(r.data.map(({ label, url, open_in_new_tab, is_active }) => ({ label, url, open_in_new_tab, is_active })))).catch(setLoadError);
    api.get('/admin/pages', { status: 'published', per_page: 100 }).then((r) => setPages(r.data)).catch(() => {});
  }, []);

  const change = (next) => { setItems(next); setDirty(true); };
  const update = (i, k, v) => change(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const move = (i, dir) => {
    const next = [...items];
    const [it] = next.splice(i, 1);
    next.splice(i + dir, 0, it);
    change(next);
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const res = await api.put('/admin/menu', { items });
      toast(res.message);
      setDirty(false);
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.status === 422 ? 'Every menu item needs a label and a link.' : err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorBox error={loadError} />;
  if (!items) return <div className="center pad"><Spinner /></div>;

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="The navigation bar at the top of every page."
        actions={
          <>
            {dirty && <span className="unsaved">Unsaved changes</span>}
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save menu'}</button>
          </>
        }
      />
      <Card>
        <div className="menu-preview" aria-hidden="true">
          {items.filter((i) => i.is_active).map((i, n) => <span key={n}>{i.label || '…'}</span>)}
        </div>
        <ol className="menu-editor">
          {items.map((it, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className={`menu-row ${it.is_active ? '' : 'is-inactive'}`}>
              <div className="brand-order">
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                <button type="button" className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
              </div>
              <div className="menu-fields">
                <input className={`input ${errors[`items.${i}.label`] ? 'is-invalid' : ''}`} placeholder="Label" aria-label={`Label ${i + 1}`} value={it.label} onChange={(e) => update(i, 'label', e.target.value)} maxLength={60} />
                <input className={`input ${errors[`items.${i}.url`] ? 'is-invalid' : ''}`} placeholder="/about/ or https://…" aria-label={`Link ${i + 1}`} value={it.url} onChange={(e) => update(i, 'url', e.target.value)} list="menu-pages" />
              </div>
              <div className="menu-flags">
                <Toggle id={`m-active-${i}`} checked={it.is_active} onChange={(v) => update(i, 'is_active', v)} label="Shown" />
                <Toggle id={`m-new-${i}`} checked={it.open_in_new_tab} onChange={(v) => update(i, 'open_in_new_tab', v)} label="New tab" />
              </div>
              <button type="button" className="icon-btn danger" aria-label="Remove item" onClick={() => change(items.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ol>
        <datalist id="menu-pages">
          <option value="/">Home</option>
          <option value="/blog/">Latest News</option>
          {pages.map((p) => <option key={p.id} value={p.path}>{p.title}</option>)}
        </datalist>
        <button type="button" className="btn btn-ghost" onClick={() => change([...items, { label: '', url: '/', open_in_new_tab: false, is_active: true }])}>+ Add menu item</button>
      </Card>
    </>
  );
}
