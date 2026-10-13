import { Link } from 'react-router-dom';
import useList from '../../hooks/useList';
import { api, SITE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, StatusBadge, Badge, ErrorBox } from '../../components/UI';
import { formatDate } from '../../utils/format';

export const TEMPLATE_LABELS = {
  default: 'Standard page',
  home: 'Home page',
  about: 'About Us',
  designer: 'Our Designers',
  blog: 'Latest News (blog)',
  contact: 'Contact Us',
};

export default function PagesPage() {
  const list = useList('/admin/pages', { per_page: 50 });
  const { params, setParam } = list;
  const trash = params.trashed === 'only';
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();

  const run = async (fn) => {
    try {
      const res = await fn();
      toast(res.message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const columns = [
    {
      key: 'title', label: 'Title', sortable: true,
      render: (r) => (
        <div>
          {trash ? <strong>{r.title}</strong> : <Link to={`/pages/${r.id}`} className="row-title">{r.title}</Link>}
          <div className="row-sub">{r.path}</div>
        </div>
      ),
    },
    { key: 'template', label: 'Template', render: (r) => <Badge>{TEMPLATE_LABELS[r.template] || r.template}</Badge> },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'menu_order', label: 'Order', sortable: true },
    { key: 'updated_at', label: 'Updated', sortable: true, render: (r) => formatDate(r.updated_at) },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (r) => (trash ? (
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => run(() => api.post(`/admin/pages/${r.id}/restore`))}>Restore</button>
          {isAdmin && (
            <button type="button" className="btn btn-sm btn-ghost danger" onClick={async () => {
              if (await confirm({ title: 'Delete permanently?', message: `"${r.title}" cannot be recovered.`, danger: true })) run(() => api.del(`/admin/pages/${r.id}/force`));
            }}>Delete forever</button>
          )}
        </div>
      ) : (
        <div className="row-actions">
          <Link to={`/pages/${r.id}`} className="btn btn-sm btn-ghost">Edit</Link>
          {r.status === 'published' && <a className="btn btn-sm btn-ghost" href={SITE_URL + r.path} target="_blank" rel="noopener noreferrer">View</a>}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => run(() => api.patch(`/admin/pages/${r.id}/status`, { status: r.status === 'published' ? 'draft' : 'published' }))}>
            {r.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          {r.template !== 'home' && (
            <button type="button" className="btn btn-sm btn-ghost danger" onClick={async () => {
              if (await confirm({ title: 'Move to trash?', message: `"${r.title}" will disappear from the website.`, danger: true, confirmLabel: 'Move to trash' })) run(() => api.del(`/admin/pages/${r.id}`));
            }}>Trash</button>
          )}
        </div>
      )),
    },
  ];

  return (
    <>
      <PageHeader title={trash ? 'Pages — Trash' : 'Pages'} subtitle="Home, About Us, Our Designers, Contact Us and other fixed pages." actions={<Link to="/pages/new" className="btn btn-primary">+ New page</Link>} />
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!trash} className={`tab ${!trash ? 'active' : ''}`} onClick={() => setParam({ trashed: '' })}>All pages</button>
        <button type="button" role="tab" aria-selected={trash} className={`tab ${trash ? 'active' : ''}`} onClick={() => setParam({ trashed: 'only' })}>Trash</button>
      </div>
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search pages…" />
        <select className="input" value={params.status || ''} onChange={(e) => setParam({ status: e.target.value })} aria-label="Status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable columns={columns} rows={list.rows} loading={list.loading} sort={params.sort || 'menu_order'} onSort={(sort) => setParam({ sort })} empty={trash ? 'Trash is empty.' : 'No pages found.'} />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
    </>
  );
}
