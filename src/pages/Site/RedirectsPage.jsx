import { useState } from 'react';
import useList from '../../hooks/useList';
import { api, SITE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal, useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, Field, Toggle, Badge, ErrorBox } from '../../components/UI';
import { formatDate } from '../../utils/format';

/** 301/302/410 rules — keeps old WordPress links working. */
export default function RedirectsPage() {
  const list = useList('/admin/redirects', { per_page: 50 });
  const { params, setParam } = list;
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();

  const remove = async (r) => {
    if (!(await confirm({ title: 'Delete redirect?', message: `${r.from_path} will no longer redirect.`, danger: true }))) return;
    try {
      toast((await api.del(`/admin/redirects/${r.id}`)).message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'from_path', label: 'Old address', sortable: true, render: (r) => <a href={SITE_URL + r.from_path} target="_blank" rel="noopener noreferrer"><code>{r.from_path}</code></a> },
    { key: 'to_path', label: 'Goes to', render: (r) => (r.status_code === 410 ? <span className="muted">Gone (410)</span> : <code>{r.to_path}</code>) },
    { key: 'status_code', label: 'Type', sortable: true, render: (r) => <Badge tone={r.status_code === 301 ? 'green' : r.status_code === 410 ? 'gray' : 'amber'}>{r.status_code}</Badge> },
    { key: 'hits', label: 'Hits', sortable: true, render: (r) => <span title={r.last_hit_at ? `Last: ${formatDate(r.last_hit_at, true)}` : 'Never used'}>{r.hits || 0}</span> },
    { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : <span className="muted">No</span>) },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (r) => (
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(r)}>Edit</button>
          <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Redirects"
        subtitle="Send old addresses to new ones so bookmarks and Google links keep working. Changing a published slug adds one automatically."
        actions={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}>+ Add redirect</button>}
      />
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search paths…" />
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} sort={params.sort || 'from_path'} onSort={(sort) => setParam({ sort })} empty="No redirects." />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
      {editing && <RedirectModal item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
    </>
  );
}

function RedirectModal({ item, onClose, onSaved }) {
  const isNew = !item.id;
  const [form, setForm] = useState({ from_path: item.from_path || '/', to_path: item.to_path || '/', status_code: item.status_code || 301, is_active: item.is_active ?? true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = { ...form, status_code: Number(form.status_code), to_path: Number(form.status_code) === 410 ? null : form.to_path };
    try {
      const res = isNew ? await api.post('/admin/redirects', body) : await api.put(`/admin/redirects/${item.id}`, body);
      toast(res.message);
      onSaved();
    } catch (err) {
      setErrors(err.errors || {});
      if (err.status !== 422) toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'Add redirect' : 'Edit redirect'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="redirect-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="redirect-form" onSubmit={submit}>
        <Field label="Old address (path)" htmlFor="r-from" error={errors.from_path} hint="For example /old-page/ — must start with /" required>
          <input id="r-from" className="input" value={form.from_path} onChange={(e) => set('from_path', e.target.value)} autoFocus />
        </Field>
        <Field label="Type" htmlFor="r-code" error={errors.status_code}>
          <select id="r-code" className="input" value={form.status_code} onChange={(e) => set('status_code', e.target.value)}>
            <option value={301}>301 — moved permanently (recommended)</option>
            <option value={302}>302 — temporary</option>
            <option value={410}>410 — gone, no replacement</option>
          </select>
        </Field>
        {Number(form.status_code) !== 410 && (
          <Field label="New address" htmlFor="r-to" error={errors.to_path} hint="A path like /blog/ or a full https:// link" required>
            <input id="r-to" className="input" value={form.to_path} onChange={(e) => set('to_path', e.target.value)} />
          </Field>
        )}
        <Toggle id="r-active" checked={form.is_active} onChange={(v) => set('is_active', v)} label="Active" />
      </form>
    </Modal>
  );
}
