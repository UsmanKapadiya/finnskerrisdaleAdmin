import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useResourceForm from '../../hooks/useResourceForm';
import { SITE_URL } from '../../services/api';
import { PageHeader, Field, Card, Spinner, ErrorBox } from '../../components/UI';
import MediaPicker from '../../components/MediaPicker';
import Uploader from '../../components/Uploader';
import { slugify } from '../../utils/format';

const EMPTY = { title: '', slug: '', description: '', status: 'draft', sort_order: 0, cover_media_id: null, photos: [] };

const toForm = (g) => ({
  title: g.title || '',
  slug: g.slug || '',
  description: g.description || '',
  status: g.status || 'draft',
  sort_order: g.sort_order ?? 0,
  cover_media_id: g.cover_media_id || null,
  photos: (g.photos || []).map((p) => ({ ...p, caption: p.caption || '' })),
});

const toPayload = (f) => ({
  title: f.title,
  slug: f.slug || null,
  description: f.description || null,
  status: f.status,
  sort_order: Number(f.sort_order) || 0,
  cover_media_id: f.cover_media_id,
  photos: f.photos.map((p) => ({ media_id: p.id, caption: p.caption || null })),
});

export default function GalleryEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { form, set, errors, loading, saving, loadError, dirty, save, record, isNew } = useResourceForm({ endpoint: '/admin/galleries', id, empty: EMPTY, toForm, toPayload });
  const [picker, setPicker] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  if (loading) return <div className="center pad"><Spinner /></div>;
  if (loadError) return <ErrorBox error={loadError} />;

  const addPhotos = (media) => set('photos', [...form.photos, ...media.filter((m) => !form.photos.some((p) => p.id === m.id)).map((m) => ({ ...m, caption: m.caption || '' }))]);
  const move = (i, dir) => {
    const next = [...form.photos];
    const [p] = next.splice(i, 1);
    next.splice(i + dir, 0, p);
    set('photos', next);
  };
  const setCaption = (i, caption) => set('photos', form.photos.map((p, j) => (j === i ? { ...p, caption } : p)));

  const submit = async (e) => {
    e.preventDefault();
    const saved = await save();
    if (saved && isNew) navigate(`/galleries/${saved.id}`, { replace: true });
  };

  return (
    <form onSubmit={submit} className="editor-page">
      <PageHeader
        back="/galleries"
        title={isNew ? 'New gallery' : `Edit gallery: ${record?.title || ''}`}
        actions={
          <>
            {!isNew && record?.status === 'published' && <a className="btn btn-ghost" href={`${SITE_URL}/gallery/${record.slug}/`} target="_blank" rel="noopener noreferrer">View on site ↗</a>}
            {dirty && <span className="unsaved">Unsaved changes</span>}
          </>
        }
      />
      <div className="editor-grid">
        <div className="editor-main">
          <Field label="Title" htmlFor="g-title" error={errors.title} required>
            <input id="g-title" className="input input-lg" value={form.title} onChange={(e) => { set('title', e.target.value); if (isNew && !slugTouched) set('slug', slugify(e.target.value)); }} />
          </Field>
          <Field label="Description" htmlFor="g-desc" error={errors.description}>
            <textarea id="g-desc" className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Card title={`Photos (${form.photos.length})`} actions={<button type="button" className="btn btn-sm" onClick={() => setPicker(true)}>Choose from library</button>}>
            <Uploader folder="gallery-photos" compact onUploaded={addPhotos} />
            {errors.photos && <p className="field-error">{errors.photos[0]}</p>}
            {form.photos.length === 0 ? <p className="muted center">No photos yet — upload some or pick them from the library.</p> : (
              <ul className="photo-list">
                {form.photos.map((p, i) => (
                  <li key={p.id} className={`photo-row ${form.cover_media_id === p.id ? 'is-cover' : ''}`}>
                    <img src={p.variants?.thumb || p.url} alt={p.alt || ''} />
                    <input className="input" placeholder="Caption (optional)" value={p.caption} onChange={(e) => setCaption(i, e.target.value)} aria-label={`Caption for photo ${i + 1}`} />
                    <div className="photo-tools">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => set('cover_media_id', form.cover_media_id === p.id ? null : p.id)}>{form.cover_media_id === p.id ? '★ Cover' : '☆ Make cover'}</button>
                      <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                      <button type="button" className="icon-btn" disabled={i === form.photos.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
                      <button type="button" className="icon-btn danger" onClick={() => { set('photos', form.photos.filter((x) => x.id !== p.id)); if (form.cover_media_id === p.id) set('cover_media_id', null); }} aria-label="Remove photo">×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <aside className="editor-side">
          <Card title="Publish">
            <Field label="Status" htmlFor="g-status">
              <select id="g-status" className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field label="URL slug" htmlFor="g-slug" error={errors.slug} hint={`/gallery/${form.slug || '…'}/`}>
              <input id="g-slug" className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
            </Field>
            <Field label="Order" htmlFor="g-order">
              <input id="g-order" type="number" min="0" className="input" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
            </Field>
            <div className="side-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create gallery' : 'Update'}</button>
            </div>
          </Card>
        </aside>
      </div>
      {picker && <MediaPicker multiple folder="gallery-photos" onClose={() => setPicker(false)} onSelect={addPhotos} />}
    </form>
  );
}
