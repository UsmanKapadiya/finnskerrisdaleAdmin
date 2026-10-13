import { useEffect, useState } from 'react';
import useList from '../../hooks/useList';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal, useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, Badge, ErrorBox, Spinner } from '../../components/UI';
import { formatDate } from '../../utils/format';

/** Contact form submissions. ?open=<id> opens one directly (used by dashboard links). */
export default function MessagesPage() {
  const list = useList('/admin/contact-submissions', { per_page: 30 });
  const { params, setParam } = list;
  const toast = useToast();
  const confirm = useConfirm();
  const openId = params.open;

  const setRead = async (row, read) => {
    try {
      toast((await api.put(`/admin/contact-submissions/${row.id}`, { read })).message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete message?', message: `The message from ${row.name} will be deleted.`, danger: true }))) return false;
    try {
      toast((await api.del(`/admin/contact-submissions/${row.id}`)).message);
      list.reload();
      return true;
    } catch (err) {
      toast(err.message, 'error');
      return false;
    }
  };

  const columns = [
    {
      key: 'name', label: 'From', sortable: true,
      render: (r) => (
        <button type="button" className={`link-btn row-title ${r.read_at ? '' : 'is-unread'}`} onClick={() => setParam({ open: r.id, page: params.page })}>
          {!r.read_at && <span className="dot" aria-label="Unread" />}{r.name}
          <div className="row-sub">{r.email}</div>
        </button>
      ),
    },
    { key: 'subject', label: 'Message', render: (r) => <span className="clip">{r.subject ? <strong>{r.subject} — </strong> : null}{r.message}</span> },
    { key: 'created_at', label: 'Received', sortable: true, render: (r) => formatDate(r.created_at, true) },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (r) => (
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRead(r, !r.read_at)}>{r.read_at ? 'Mark unread' : 'Mark read'}</button>
          <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Messages" subtitle={list.meta?.unread ? `${list.meta.unread} unread` : 'Messages sent with the website contact form.'} />
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search messages…" />
        <select className="input" value={params.read ?? ''} onChange={(e) => setParam({ read: e.target.value })} aria-label="Read status">
          <option value="">All messages</option>
          <option value="0">Unread</option>
          <option value="1">Read</option>
        </select>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} sort={params.sort || '-id'} onSort={(sort) => setParam({ sort })} empty="No messages yet." />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
      {openId && (
        <MessageModal
          id={openId}
          onClose={() => { setParam({ open: '', page: params.page }); list.reload(); }}
          onDelete={async (row) => { if (await remove(row)) setParam({ open: '', page: params.page }); }}
        />
      )}
    </>
  );
}

function MessageModal({ id, onClose, onDelete }) {
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api.get(`/admin/contact-submissions/${id}`).then((r) => setMsg(r.data)).catch(setError);
  }, [id]);

  return (
    <Modal
      title={msg?.subject || 'Message'}
      onClose={onClose}
      footer={msg && (
        <>
          <button type="button" className="btn btn-ghost danger" onClick={() => onDelete(msg)}>Delete</button>
          <span className="spacer" />
          <a className="btn btn-primary" href={`mailto:${msg.email}?subject=${encodeURIComponent('Re: ' + (msg.subject || 'Your message to Finns Kerrisdale Ladies'))}`}>Reply by email</a>
        </>
      )}
    >
      <ErrorBox error={error} />
      {!msg && !error && <div className="center pad"><Spinner /></div>}
      {msg && (
        <div className="message-view">
          <dl className="meta-list">
            <dt>From</dt><dd>{msg.name} &lt;<a href={`mailto:${msg.email}`}>{msg.email}</a>&gt;</dd>
            {msg.phone && <><dt>Phone</dt><dd><a href={`tel:${msg.phone}`}>{msg.phone}</a></dd></>}
            <dt>Received</dt><dd>{formatDate(msg.created_at, true)} <Badge tone="green">read</Badge></dd>
          </dl>
          <div className="message-body">{msg.message}</div>
        </div>
      )}
    </Modal>
  );
}
