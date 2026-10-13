import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card, ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/UI';
import { formatBytes, formatDate } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

function Stat({ label, value, to, note }) {
  const body = (
    <>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {note && <span className="stat-note">{note}</span>}
    </>
  );
  return to ? <Link to={to} className="stat">{body}</Link> : <div className="stat">{body}</div>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then((r) => setData(r.data)).catch(setError);
  }, []);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <div className="center pad"><Spinner /></div>;
  const s = data.stats;
  const years = Object.entries(data.posts_per_year || {});
  const maxYear = Math.max(1, ...years.map(([, n]) => n));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || ''}`}
        subtitle="Here’s what’s happening on finnskerrisdaleladies.com"
        actions={<Link to="/posts/create" className="btn btn-primary">+ New post</Link>}
      />
      <div className="stats">
        <Stat label="Published posts" value={s.posts_published} to="/posts?status=published" note={s.posts_draft ? `${s.posts_draft} draft${s.posts_draft > 1 ? 's' : ''}` : null} />
        <Stat label="Pages" value={s.pages} to="/pages" />
        <Stat label="Images" value={s.media} to="/media" note={`${formatBytes(s.media_bytes)}${s.media_saved_bytes > 0 ? ` · ${formatBytes(s.media_saved_bytes)} saved` : ''}`} />
        <Stat label="Subscribers" value={s.subscribers} to="/subscribers" />
        <Stat label="Unread messages" value={s.contact_unread} to="/contact-submissions?read=0" />
      </div>

      <div className="grid-2">
        <Card title="Recently edited posts" actions={<Link to="/posts" className="link">All posts</Link>}>
          <ul className="list">
            {data.recent_posts.map((p) => (
              <li key={p.id}>
                <Link to={`/posts/${p.id}`}>{p.title || '(no title)'}</Link>
                <span className="list-meta"><StatusBadge status={p.status} /> {formatDate(p.updated_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Latest messages" actions={<Link to="/contact-submissions" className="link">Inbox</Link>}>
          {data.recent_submissions.length ? (
            <ul className="list">
              {data.recent_submissions.map((m) => (
                <li key={m.id}>
                  <Link to={`/contact-submissions?open=${m.id}`}>{m.read_at ? '' : '● '}{m.name}</Link>
                  <span className="list-meta">{formatDate(m.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No messages yet.</p>}
        </Card>
        <Card title="New subscribers" actions={<Link to="/subscribers" className="link">All</Link>}>
          {data.recent_subscribers.length ? (
            <ul className="list">
              {data.recent_subscribers.map((m) => (
                <li key={m.id}><span>{m.email}</span><span className="list-meta">{formatDate(m.created_at)}</span></li>
              ))}
            </ul>
          ) : <p className="muted">No subscribers yet.</p>}
        </Card>
        <Card title="Posts per year">
          <div className="bars" role="img" aria-label="Number of published posts per year">
            {years.map(([y, n]) => (
              <div key={y} className="bar-row">
                <span className="bar-label">{y}</span>
                <span className="bar" style={{ width: `${(n / maxYear) * 100}%` }} />
                <span className="bar-value">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
