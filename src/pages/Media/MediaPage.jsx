import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useList from '../../hooks/useList';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal, useConfirm } from '../../components/Modal';
import { Pager, SearchInput } from '../../components/DataTable';
import Uploader, { FOLDERS } from '../../components/Uploader';
import { PageHeader, Field, Spinner, ErrorBox, EmptyState, Badge } from '../../components/UI';
import { formatBytes, formatDate } from '../../utils/format';

const USAGE_LINK = { post: (id) => `/posts/${id}`, page: (id) => `/pages/${id}`, gallery: (id) => `/galleries/${id}`, brand: () => '/brands' };

export default function MediaPage() {
  const list = useList('/admin/media', { per_page: 48 });
  const { params, setParam } = list;
  const [openId, setOpenId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <PageHeader
        title="Media library"
        subtitle="Every upload is resized, compressed and saved as WebP with thumbnail, medium and large sizes."
        actions={<button type="button" className="btn btn-primary" onClick={() => setShowUpload((v) => !v)}>{showUpload ? 'Close uploader' : '+ Upload images'}</button>}
      />
      {showUpload && <Uploader folder={params.folder || 'general'} onUploaded={() => list.reload()} />}
      <div className="toolbar">
        <SearchInput value={params.q} onChange={(q) => setParam({ q })} placeholder="Search by file name, alt text…" />
        <select className="input" value={params.folder || ''} onChange={(e) => setParam({ folder: e.target.value })} aria-label="Folder">
          <option value="">All folders</option>
          {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="input" value={params.sort || '-id'} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sort">
          <option value="-id">Newest first</option>
          <option value="id">Oldest first</option>
          <option value="-size_bytes">Largest files</option>
          <option value="original_name">Name A–Z</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={params.missing_alt === '1'} onChange={(e) => setParam({ missing_alt: e.target.checked ? '1' : '' })} />
          Missing alt text
        </label>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading ? <div className="center pad"><Spinner /></div> : list.rows.length === 0 ? (
        <EmptyState title="No images found" />
      ) : (
        <ul className="media-grid">
          {list.rows.map((m) => (
            <li key={m.id}>
              <button type="button" className="media-tile" onClick={() => setOpenId(m.id)} title={m.original_name}>
                <img src={m.variants?.thumb || m.url} alt={m.alt || ''} loading="lazy" />
                {!m.alt && <span className="media-flag" title="Missing alt text">alt</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pager meta={list.meta} onPage={(page) => setParam({ page })} />
      {openId && <MediaDetails id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />}
    </>
  );
}

function MediaDetails({ id, onClose, onChanged }) {
  const [m, setM] = useState(null);
  const [form, setForm] = useState({ alt: '', title: '', caption: '', folder: 'general' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const toast = useToast();
  const confirm = useConfirm();

  const load = () => api.get(`/admin/media/${id}`).then((r) => {
    setM(r.data);
    setForm({ alt: r.data.alt || '', title: r.data.title || '', caption: r.data.caption || '', folder: r.data.folder });
  }).catch((err) => toast(err.message, 'error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api.put(`/admin/media/${id}`, form);
      toast(res.message);
      setM((x) => ({ ...x, ...res.data }));
      onChanged();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const replace = async (file) => {
    if (!file) return;
    if (!(await confirm({ title: 'Replace this image?', message: 'The new file takes the same address, so everywhere this image is used updates automatically.', confirmLabel: 'Replace' }))) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.upload(`/admin/media/${id}/replace`, fd);
      toast(res.message);
      await load();
      onChanged();
    } catch (err) {
      toast(Object.values(err.errors || {}).flat()[0] || err.message, 'error');
    } finally {
      setBusy(false);
      fileRef.current.value = '';
    }
  };

  const remove = async () => {
    const inUse = m.usages?.length > 0;
    const ok = await confirm({
      title: 'Delete this image?',
      message: inUse ? `It is still used in ${m.usages.length} place(s). Those places will show a broken image. Delete anyway?` : 'The file and all its sizes will be deleted.',
      danger: true,
      confirmLabel: inUse ? 'Delete anyway' : 'Delete',
    });
    if (!ok) return;
    try {
      const res = await api.del(`/admin/media/${id}`, inUse ? { force: 1 } : undefined);
      toast(res.message);
      onChanged();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Link copied');
    } catch {
      window.prompt('Copy this link:', text);
    }
  };

  const saved = m && m.original_size_bytes > m.size_bytes ? Math.round((1 - m.size_bytes / m.original_size_bytes) * 100) : 0;

  return (
    <Modal
      title="Image details"
      size="xl"
      onClose={onClose}
      footer={m && (
        <>
          <button type="button" className="btn btn-ghost danger" onClick={remove} disabled={busy}>Delete</button>
          <span className="spacer" />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => replace(e.target.files[0])} />
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={busy}>Replace file…</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
        </>
      )}
    >
      {!m ? <div className="center pad"><Spinner /></div> : (
        <div className="media-details">
          <div className="media-preview">
            <img src={m.variants?.large || m.url} alt={m.alt || ''} />
          </div>
          <div className="media-meta">
            <dl className="meta-list">
              <dt>File</dt><dd>{m.original_name || m.filename}</dd>
              <dt>Size</dt><dd>{m.width} × {m.height}px · {formatBytes(m.size_bytes)}{saved > 0 && <> <Badge tone="green">−{saved}% ({formatBytes(m.original_size_bytes)} original)</Badge></>}</dd>
              <dt>Type</dt><dd>{m.mime_type}</dd>
              <dt>Uploaded</dt><dd>{formatDate(m.created_at, true)}{m.uploaded_by && ` by ${m.uploaded_by}`}</dd>
              <dt>Address</dt>
              <dd className="copy-row">
                <code>{m.url}</code>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => copy(m.url)}>Copy</button>
              </dd>
              {m.variants && Object.keys(m.variants).length > 0 && (
                <>
                  <dt>Sizes</dt>
                  <dd>{Object.entries(m.variants).map(([k, u]) => <a key={k} href={u} target="_blank" rel="noopener noreferrer" className="variant-link">{k}</a>)}</dd>
                </>
              )}
            </dl>
            <Field label="Alt text" htmlFor="m-alt" error={errors.alt} hint="Describe the image for screen readers and Google.">
              <input id="m-alt" className="input" value={form.alt} onChange={(e) => set('alt', e.target.value)} />
            </Field>
            <Field label="Title" htmlFor="m-title" error={errors.title}>
              <input id="m-title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Caption" htmlFor="m-caption" error={errors.caption}>
              <textarea id="m-caption" className="input" rows={2} value={form.caption} onChange={(e) => set('caption', e.target.value)} />
            </Field>
            <Field label="Folder" htmlFor="m-folder" error={errors.folder}>
              <select id="m-folder" className="input" value={form.folder} onChange={(e) => set('folder', e.target.value)}>
                {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <div className="usages">
              <strong>Used in</strong>
              {m.usages?.length ? (
                <ul>
                  {m.usages.map((u) => (
                    <li key={u.type + u.id}><Badge>{u.type}</Badge> <Link to={USAGE_LINK[u.type](u.id)} onClick={onClose}>{u.title}</Link></li>
                  ))}
                </ul>
              ) : <p className="muted">Not used anywhere yet.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
