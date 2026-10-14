import { useEffect, useState } from 'react';
import { api, SITE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal, useConfirm } from '../../components/Modal';
import { PageHeader, Field, Toggle, Badge, Spinner, ErrorBox, EmptyState } from '../../components/UI';
import ImageField from '../../components/ImageField';
import { slugify } from '../../utils/format';

/** Designer brand logos shown on the "Our Designers" page, in display order. */
export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = () => {
    setLoading(true);
    api.get('/admin/brands', { all: 1 })
      .then((r) => { setBrands(r.data); setOrderDirty(false); setError(null); })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const move = (i, dir) => {
    const next = [...brands];
    const [b] = next.splice(i, 1);
    next.splice(i + dir, 0, b);
    setBrands(next);
    setOrderDirty(true);
  };
  const saveOrder = async () => {
    try {
      const res = await api.put('/admin/brands/order', { ids: brands.map((b) => b.id) });
      toast(res.message);
      setOrderDirty(false);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const toggleActive = async (b) => {
    try {
      const res = await api.put(`/admin/brands/${b.id}`, { is_active: !b.is_active });
      toast(res.data.is_active ? `${b.name} is now shown on the website` : `${b.name} is now hidden`);
      setBrands((all) => all.map((x) => (x.id === b.id ? res.data : x)));
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const remove = async (b) => {
    if (!(await confirm({ title: `Delete ${b.name}?`, message: 'The brand will be removed from the Our Designers page.', danger: true }))) return;
    try {
      const res = await api.del(`/admin/brands/${b.id}`);
      toast(res.message);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Designers"
        subtitle={<>Brand logos on the <a href={`${SITE_URL}/designer/`} target="_blank" rel="noopener noreferrer">Our Designers</a> page, in this order.</>}
        actions={
          <>
            {orderDirty && <button type="button" className="btn" onClick={saveOrder}>Save order</button>}
            <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>+ Add designer</button>
          </>
        }
      />
      <ErrorBox error={error} onRetry={load} />
      {loading ? <div className="center pad"><Spinner /></div> : brands.length === 0 ? (
        <EmptyState title="No designers yet" action={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}>Add the first one</button>} />
      ) : (
        <ul className="brand-list">
          {brands.map((b, i) => (
            <li key={b.id} className={`brand-row ${b.is_active ? '' : 'is-inactive'}`}>
              <div className="brand-order">
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${b.name} up`}>▲</button>
                <button type="button" className="icon-btn" disabled={i === brands.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${b.name} down`}>▼</button>
              </div>
              <div className="brand-logo">{b.logo_url ? <img src={b.logo_url} alt={b.name} /> : <span className="muted">No logo</span>}</div>
              <div className="brand-info">
                <strong>{b.name}</strong>
                {b.label && <div className="row-sub">{b.label}</div>}
                {b.website_url && <div className="row-sub"><a href={b.website_url} target="_blank" rel="noopener noreferrer">{b.website_url}</a></div>}
              </div>
              <Badge tone={b.is_active ? 'green' : 'gray'}>{b.is_active ? 'shown' : 'hidden'}</Badge>
              <div className="row-actions">
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleActive(b)}>{b.is_active ? 'Hide' : 'Show'}</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(b)}>Edit</button>
                <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(b)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <BrandModal brand={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function BrandModal({ brand, onClose, onSaved }) {
  const isNew = !brand.id;
  const [form, setForm] = useState({
    name: brand.name || '', slug: brand.slug || '', label: brand.label || '', website_url: brand.website_url || '',
    description: brand.description || '', is_active: brand.is_active ?? true,
    logo: brand.logo_url ? { id: brand.logo_media_id, url: brand.logo_url } : null,
    logo_media_id: brand.logo_media_id || null,
    brand_thumbnail: brand.brand_thumbnail_url ? { id: brand.brand_thumbnail_media_id, url: brand.brand_thumbnail_url } : null,
    brand_thumbnail_media_id: brand.brand_thumbnail_media_id || null,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = {
      name: form.name, slug: form.slug || null, label: form.label || null, website_url: form.website_url || null,
      description: form.description || null, is_active: form.is_active, logo_media_id: form.logo_media_id,
      // keep an imported logo URL until a library image is chosen; clear it when the logo is removed
      ...(form.logo ? {} : { logo_url: null }),
      brand_thumbnail_media_id: form.brand_thumbnail_media_id,
      // Keep an existing thumbnail URL until a library image is chosen; clear it when removed.
      ...(form.brand_thumbnail ? {} : { brand_thumbnail_url: null }),
    };
    try {
      const res = isNew ? await api.post('/admin/brands', body) : await api.put(`/admin/brands/${brand.id}`, body);
      toast(res.message);
      onSaved(res.data);
    } catch (err) {
      setErrors(err.errors || {});
      if (err.status !== 422) toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'Add designer' : `Edit ${brand.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="brand-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="brand-form" onSubmit={submit}>
        <Field label="Brand name" htmlFor="b-name" error={errors.name} required>
          <input id="b-name" className="input" autoFocus value={form.name} onChange={(e) => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }} />
        </Field>
        <Field label="Logo" error={errors.logo_media_id} hint="Upload a transparent PNG or a square image.">
          <ImageField value={form.logo} folder="brands" onChange={(m) => { set('logo', m); set('logo_media_id', m?.id || null); }} label="Choose logo" />
        </Field>
        <Field label="Brand thumbnail" error={errors.brand_thumbnail_media_id}>
          <ImageField value={form.brand_thumbnail} folder="brands" onChange={(m) => { set('brand_thumbnail', m); set('brand_thumbnail_media_id', m?.id || null); }} label="Choose thumbnail" />
        </Field>
        <Field label="Caption under the logo" htmlFor="b-label" error={errors.label}>
          <input id="b-label" className="input" value={form.label} onChange={(e) => set('label', e.target.value)} />
        </Field>
        <Field label="Website" htmlFor="b-web" error={errors.website_url}>
          <input id="b-web" className="input" type="url" placeholder="https://" value={form.website_url} onChange={(e) => set('website_url', e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="b-desc" error={errors.description}>
          <textarea id="b-desc" className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Slug" htmlFor="b-slug" error={errors.slug}>
          <input id="b-slug" className="input" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
        </Field>
        <Toggle id="b-active" checked={form.is_active} onChange={(v) => set('is_active', v)} label="Show on the website" />
      </form>
    </Modal>
  );
}
