import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useList from '../../hooks/useList';
import { api, SITE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal, useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, Field, ErrorBox } from '../../components/UI';
import { slugify } from '../../utils/format';

/** Categories and tags share one screen: list + modal editor. */
export default function TaxonomyPage({ kind }) {
  const isCat = kind === 'categories';
  const label = isCat ? 'Category' : 'Tag';
  const list = useList(`/admin/${kind}`, { per_page: 50 });
  const { params, setParam } = list;
  const [editing, setEditing] = useState(null);
  const [allCats, setAllCats] = useState([]);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (isCat) api.get('/admin/categories', { all: 1 }).then((r) => setAllCats(r.data)).catch(() => {});
  }, [isCat, list.rows]);

  const remove = async (row) => {
    const msg = row.posts_count ? `It is used by ${row.posts_count} post(s); they will simply lose this ${label.toLowerCase()}.` : 'It is not used by any posts.';
    if (!(await confirm({ title: `Delete "${row.name}"?`, message: msg, danger: true }))) return;
    try {
      const res = await api.del(`/admin/${kind}/${row.id}`);
      toast(res.message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (r) => <button type="button" className="link-btn row-title" onClick={() => setEditing(r)}>{r.name}</button> },
    { key: 'slug', label: 'Slug', sortable: isCat, render: (r) => <code>{r.slug}</code> },
    ...(isCat ? [{ key: 'parent', label: 'Parent', render: (r) => allCats.find((c) => c.id === r.parent_id)?.name || '—' }] : []),
    { key: 'posts_count', label: 'Posts', sortable: true, render: (r) => <Link to={`/posts?${isCat ? 'category_id' : 'tag_id'}=${r.id}`}>{r.posts_count ?? 0}</Link> },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (r) => (
        <div className="row-actions">
          {isCat && <a className="btn btn-sm btn-ghost" href={`${SITE_URL}/category/${r.slug}/`} target="_blank" rel="noopener noreferrer">View</a>}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}>Edit</button>
          <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={isCat ? 'Categories' : 'Tags'}
        subtitle={isCat ? 'Group Latest News posts (for example by designer brand).' : 'Free keywords attached to posts.'}
        actions={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}>+ New {label.toLowerCase()}</button>}
      />
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder={`Search ${kind}…`} />
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} sort={params.sort || 'name'} onSort={(sort) => setParam({ sort })} empty={`No ${kind} yet.`} />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
      {editing && (
        <TaxonomyModal kind={kind} label={label} item={editing} categories={allCats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />
      )}
    </>
  );
}

function TaxonomyModal({ kind, label, item, categories, onClose, onSaved }) {
  const isNew = !item.id;
  const [form, setForm] = useState({ name: item.name || '', slug: item.slug || '', description: item.description || '', parent_id: item.parent_id || '', sort_order: item.sort_order ?? 0 });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isCat = kind === 'categories';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = { name: form.name, slug: form.slug || null };
    if (isCat) Object.assign(body, { description: form.description || null, parent_id: form.parent_id ? Number(form.parent_id) : null, sort_order: Number(form.sort_order) || 0 });
    try {
      const res = isNew ? await api.post(`/admin/${kind}`, body) : await api.put(`/admin/${kind}/${item.id}`, body);
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
      title={isNew ? `New ${label.toLowerCase()}` : `Edit ${label.toLowerCase()}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="tax-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="tax-form" onSubmit={submit}>
        <Field label="Name" htmlFor="tax-name" error={errors.name} required>
          <input id="tax-name" className="input" value={form.name} autoFocus onChange={(e) => { set('name', e.target.value); if (isNew) set('slug', slugify(e.target.value)); }} />
        </Field>
        <Field label="Slug" htmlFor="tax-slug" error={errors.slug} hint={isCat ? `Address: /category/${form.slug || '…'}/` : undefined}>
          <input id="tax-slug" className="input" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
        </Field>
        {isCat && (
          <>
            <Field label="Parent category" htmlFor="tax-parent" error={errors.parent_id}>
              <select id="tax-parent" className="input" value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)}>
                <option value="">None</option>
                {categories.filter((c) => c.id !== item.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Description" htmlFor="tax-desc" error={errors.description}>
              <textarea id="tax-desc" className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <Field label="Order" htmlFor="tax-order">
              <input id="tax-order" type="number" min="0" className="input" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}
