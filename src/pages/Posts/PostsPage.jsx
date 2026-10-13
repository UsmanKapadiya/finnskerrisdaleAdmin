import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useList from '../../hooks/useList';
import { api, SITE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../components/Modal';
import DataTable, { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, StatusBadge, ErrorBox } from '../../components/UI';
import { formatDate } from '../../utils/format';

export default function PostsPage() {
  const list = useList('/admin/posts', { per_page: 20 });
  const { params, setParam } = list;
  const trash = params.trashed === 'only';
  const [selected, setSelected] = useState([]);
  const [categories, setCategories] = useState([]);
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();

  useEffect(() => {
    api.get('/admin/categories', { all: 1 }).then((r) => setCategories(r.data)).catch(() => {});
  }, []);
  useEffect(() => setSelected([]), [list.rows]);

  const run = async (fn, okMsg) => {
    try {
      const res = await fn();
      toast(okMsg || res.message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleStatus = (row) => run(() => api.patch(`/admin/posts/${row.id}/status`, { status: row.status === 'published' ? 'draft' : 'published' }));
  const trashPost = async (row) => {
    if (await confirm({ title: 'Move to trash?', message: `"${row.title}" will be hidden from the website. You can restore it from the trash.`, danger: true, confirmLabel: 'Move to trash' })) {
      run(() => api.del(`/admin/posts/${row.id}`));
    }
  };
  const restore = (row) => run(() => api.post(`/admin/posts/${row.id}/restore`));
  const forceDelete = async (row) => {
    if (await confirm({ title: 'Delete permanently?', message: `"${row.title}" will be deleted forever. This cannot be undone.`, danger: true })) {
      run(() => api.del(`/admin/posts/${row.id}/force`));
    }
  };
  const bulk = async (action) => {
    if (action === 'delete' && !(await confirm({ title: `Move ${selected.length} posts to trash?`, message: 'They will be hidden from the website.', danger: true, confirmLabel: 'Move to trash' }))) return;
    run(() => api.post('/admin/posts/bulk', { ids: selected, action }), `${selected.length} post(s) updated`);
  };

  const columns = [
    {
      key: 'title', label: 'Title', sortable: true, className: 'col-title',
      render: (r) => (
        <div>
          {trash ? <strong>{r.title || '(no title)'}</strong> : <Link to={`/posts/${r.id}`} className="row-title">{r.title || '(no title)'}</Link>}
          <div className="row-sub">{r.path}</div>
        </div>
      ),
    },
    { key: 'categories', label: 'Categories', render: (r) => (r.categories || []).map((c) => c.name).join(', ') || '—' },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'published_at', label: 'Date', sortable: true, render: (r) => formatDate(r.published_at) },
    {
      key: 'actions', label: '', className: 'col-actions',
      render: (r) => (trash ? (
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => restore(r)}>Restore</button>
          {isAdmin && <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => forceDelete(r)}>Delete forever</button>}
        </div>
      ) : (
        <div className="row-actions">
          <Link to={`/posts/${r.id}`} className="btn btn-sm btn-ghost">Edit</Link>
          {r.status === 'published' && <a className="btn btn-sm btn-ghost" href={SITE_URL + r.path} target="_blank" rel="noopener noreferrer">View</a>}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleStatus(r)}>{r.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => trashPost(r)} aria-label={`Trash ${r.title}`}>Trash</button>
        </div>
      )),
    },
  ];

  return (
    <>
      <PageHeader
        title={trash ? 'Posts — Trash' : 'Posts'}
        subtitle={trash ? 'Trashed posts can be restored.' : 'Latest News articles shown on the blog.'}
        actions={<Link to="/posts/new" className="btn btn-primary">+ New post</Link>}
      />
      <div className="tabs" role="tablist">
        {[['', 'All'], ['published', 'Published'], ['draft', 'Drafts']].map(([v, l]) => (
          <button key={l} type="button" role="tab" aria-selected={!trash && (params.status || '') === v} className={`tab ${!trash && (params.status || '') === v ? 'active' : ''}`} onClick={() => setParam({ status: v, trashed: '' })}>{l}</button>
        ))}
        <button type="button" role="tab" aria-selected={trash} className={`tab ${trash ? 'active' : ''}`} onClick={() => setParam({ trashed: 'only', status: '' })}>Trash</button>
      </div>
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search posts…" />
        <select className="input" value={params.category_id || ''} onChange={(e) => setParam({ category_id: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="input" value={params.from || ''} onChange={(e) => setParam({ from: e.target.value })} aria-label="From date" />
        <input type="date" className="input" value={params.to || ''} onChange={(e) => setParam({ to: e.target.value })} aria-label="To date" />
        {selected.length > 0 && !trash && (
          <div className="bulk-bar">
            <span>{selected.length} selected</span>
            <button type="button" className="btn btn-sm" onClick={() => bulk('publish')}>Publish</button>
            <button type="button" className="btn btn-sm" onClick={() => bulk('unpublish')}>Unpublish</button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => bulk('delete')}>Trash</button>
          </div>
        )}
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      <DataTable
        columns={columns}
        rows={list.rows}
        loading={list.loading}
        sort={params.sort || '-published_at'}
        onSort={(sort) => setParam({ sort })}
        selectable={!trash}
        selected={selected}
        onSelect={setSelected}
        empty={trash ? 'Trash is empty.' : 'No posts found.'}
      />
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
    </>
  );
}
