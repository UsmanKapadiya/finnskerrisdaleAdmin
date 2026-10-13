import { Link } from 'react-router-dom';
import useList from '../../hooks/useList';
import { api, SITE_URL } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../components/Modal';
import { Pager, SearchInput } from '../../components/DataTable';
import { PageHeader, StatusBadge, Spinner, ErrorBox, EmptyState } from '../../components/UI';

export default function GalleriesPage() {
  const list = useList('/admin/galleries', { per_page: 24 });
  const { params, setParam } = list;
  const toast = useToast();
  const confirm = useConfirm();

  const remove = async (g) => {
    if (!(await confirm({ title: `Delete "${g.title}"?`, message: 'The gallery is removed. The photos stay in the media library.', danger: true }))) return;
    try {
      toast((await api.del(`/admin/galleries/${g.id}`)).message);
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title="Galleries" subtitle="Photo collections (lookbooks, events) shown under /gallery/." actions={<Link to="/galleries/new" className="btn btn-primary">+ New gallery</Link>} />
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search galleries…" />
        <select className="input" value={params.status || ''} onChange={(e) => setParam({ status: e.target.value })} aria-label="Status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading ? <div className="center pad"><Spinner /></div> : list.rows.length === 0 ? (
        <EmptyState title="No galleries yet" action={<Link to="/galleries/new" className="btn btn-primary">Create a gallery</Link>} />
      ) : (
        <ul className="gallery-cards">
          {list.rows.map((g) => (
            <li key={g.id} className="gallery-card">
              <Link to={`/galleries/${g.id}`} className="gallery-card-img">
                {g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" /> : <span className="muted">No photos</span>}
              </Link>
              <div className="gallery-card-body">
                <Link to={`/galleries/${g.id}`} className="row-title">{g.title}</Link>
                <div className="row-sub">{g.media_count} photo{g.media_count === 1 ? '' : 's'} · <StatusBadge status={g.status} /></div>
                <div className="row-actions">
                  <Link to={`/galleries/${g.id}`} className="btn btn-sm btn-ghost">Edit</Link>
                  {g.status === 'published' && <a className="btn btn-sm btn-ghost" href={`${SITE_URL}/gallery/${g.slug}/`} target="_blank" rel="noopener noreferrer">View</a>}
                  <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => remove(g)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
    </>
  );
}
