import { useState } from 'react';
import useList from '../../hooks/useList';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, StatusBadge, ErrorBox } from '../../components/UI';
import { formatDate } from '../../utils/format';

export default function SubscribersPage() {
  const list = useList('/admin/subscribers', { per_page: 50 });
  const { params, setParam } = list;
  const [exporting, setExporting] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const setStatus = async (row, status) => {
    try {
      toast((await api.put(`/admin/subscribers/${row.id}`, { status })).message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const remove = async (row) => {
    if (!(await confirm({ title: 'Delete subscriber?', message: `${row.email} will be removed from the list.`, danger: true }))) return;
    try {
      toast((await api.del(`/admin/subscribers/${row.id}`)).message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      await api.download('/admin/subscribers/export', `subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { key: 'email', label: 'Email', sortable: true, render: (r) => <a href={`mailto:${r.email}`}>{r.email}</a> },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'source', label: 'Source', render: (r) => r.source || '—' },
    { key: 'created_at', label: 'Subscribed', sortable: true, render: (r) => formatDate(r.created_at) },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (r) => (
        <div className="row-actions">
          {r.status !== 'confirmed' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStatus(r, 'confirmed')}>Confirm</button>}
          {r.status !== 'unsubscribed' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStatus(r, 'unsubscribed')}>Unsubscribe</button>}
          <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Subscribers"
        subtitle="People who signed up with the Email Subscription form."
        actions={<button type="button" className="btn" onClick={exportCsv} disabled={exporting}>{exporting ? 'Exporting…' : 'Export CSV'}</button>}
      />
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search email…" />
        <select className="input" value={params.status || ''} onChange={(e) => setParam({ status: e.target.value })} aria-label="Status">
          <option value="">Any status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} sort={params.sort || '-id'} onSort={(sort) => setParam({ sort })} empty="No subscribers yet." />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
    </>
  );
}
