import { useState } from 'react';
import useList from '../../hooks/useList';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Modal, useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, Field, Toggle, Badge, ErrorBox } from '../../components/UI';
import { formatDate } from '../../utils/format';

export default function UsersPage() {
  const list = useList('/admin/users', { per_page: 50 });
  const { params, setParam } = list;
  const [editing, setEditing] = useState(null);
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const remove = async (u) => {
    if (!(await confirm({ title: `Delete ${u.name}?`, message: 'They will no longer be able to sign in. Their posts are kept.', danger: true }))) return;
    try {
      toast((await api.del(`/admin/users/${u.id}`)).message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (u) => <button type="button" className="link-btn row-title" onClick={() => setEditing(u)}>{u.name}{u.id === me?.id && ' (you)'}</button> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true, render: (u) => <Badge tone={u.role === 'admin' ? 'purple' : 'neutral'}>{u.role}</Badge> },
    { key: 'is_active', label: 'Status', render: (u) => (u.is_active ? <Badge tone="green">active</Badge> : <Badge tone="gray">disabled</Badge>) },
    { key: 'posts_count', label: 'Posts', render: (u) => u.posts_count ?? 0 },
    { key: 'last_login_at', label: 'Last sign-in', sortable: true, render: (u) => formatDate(u.last_login_at, true) },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (u) => (
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(u)}>Edit</button>
          {u.id !== me?.id && <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(u)}>Delete</button>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle="Admins can manage everything; editors manage content, media and the inbox." actions={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}>+ Add user</button>} />
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search name or email…" />
        <select className="input" value={params.role || ''} onChange={(e) => setParam({ role: e.target.value })} aria-label="Role">
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="editor">Editors</option>
        </select>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} sort={params.sort || 'name'} onSort={(sort) => setParam({ sort })} empty="No users." />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
      {editing && <UserModal item={editing} isSelf={editing.id === me?.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
    </>
  );
}

function UserModal({ item, isSelf, onClose, onSaved }) {
  const isNew = !item.id;
  const [form, setForm] = useState({ name: item.name || '', email: item.email || '', role: item.role || 'editor', is_active: item.is_active ?? true, password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = { name: form.name, email: form.email, role: form.role, is_active: form.is_active };
    if (form.password) body.password = form.password;
    try {
      const res = isNew ? await api.post('/admin/users', body) : await api.put(`/admin/users/${item.id}`, body);
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
      title={isNew ? 'Add user' : `Edit ${item.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} autoComplete="off">
        <Field label="Name" htmlFor="u-name" error={errors.name} required>
          <input id="u-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Email" htmlFor="u-email" error={errors.email} required>
          <input id="u-email" type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Role" htmlFor="u-role" error={errors.role}>
          <select id="u-role" className="input" value={form.role} onChange={(e) => set('role', e.target.value)} disabled={isSelf}>
            <option value="editor">Editor — content, media, inbox</option>
            <option value="admin">Admin — everything incl. users & settings</option>
          </select>
        </Field>
        <Field label={isNew ? 'Password' : 'New password'} htmlFor="u-pass" error={errors.password} hint={isNew ? 'At least 10 characters with letters and numbers.' : 'Leave empty to keep the current password.'} required={isNew}>
          <input id="u-pass" type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
        </Field>
        {!isSelf && <Toggle id="u-active" checked={form.is_active} onChange={(v) => set('is_active', v)} label="Account active (can sign in)" />}
      </form>
    </Modal>
  );
}
