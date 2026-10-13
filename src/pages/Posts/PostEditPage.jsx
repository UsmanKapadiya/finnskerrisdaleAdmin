import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useResourceForm from '../../hooks/useResourceForm';
import { api, SITE_URL } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader, Field, Card, Spinner, ErrorBox, StatusBadge, Toggle } from '../../components/UI';
import RichTextEditor from '../../components/RichTextEditor';
import ImageField from '../../components/ImageField';
import MediaPicker from '../../components/MediaPicker';
import TagInput from '../../components/TagInput';
import SeoFields from '../../components/SeoFields';
import { formatDate, fromLocalInput, slugify, stripHtml, toLocalInput } from '../../utils/format';

const EMPTY = {
  title: '', slug: '', content: '', excerpt: '', status: 'draft', published_at: '', is_featured: false,
  category_ids: [], tags: [], featured_media: null, featured_media_id: null, images: [],
  author_id: null, author_name: '',
  seo_title: '', seo_description: '', og_media: null, og_media_id: null, canonical_url: '', noindex: false,
};

const toForm = (p) => ({
  ...EMPTY,
  title: p.title || '',
  slug: p.slug || '',
  content: p.content || '',
  excerpt: p.excerpt || '',
  status: p.status,
  published_at: toLocalInput(p.published_at),
  is_featured: !!p.is_featured,
  category_ids: (p.categories || []).map((c) => c.id),
  tags: (p.tags || []).map((t) => t.name),
  featured_media: p.featured_media || null,
  featured_media_id: p.featured_media_id,
  images: p.images || [],
  author_id: p.author_id,
  seo_title: p.seo?.title || '',
  seo_description: p.seo?.description || '',
  og_media: p.seo?.og_image ? { id: p.seo.og_media_id, url: p.seo.og_image } : null,
  og_media_id: p.seo?.og_media_id || null,
  canonical_url: p.seo?.canonical_url || '',
  noindex: !!p.seo?.noindex,
});

const toPayload = (f) => ({
  title: f.title,
  slug: f.slug || null,
  content: f.content,
  excerpt: f.excerpt || null,
  status: f.status,
  published_at: fromLocalInput(f.published_at),
  is_featured: f.is_featured,
  category_ids: f.category_ids,
  tags: f.tags,
  featured_media_id: f.featured_media_id,
  image_ids: f.images.map((m) => m.id),
  author_id: f.author_id || null,
  seo_title: f.seo_title || null,
  seo_description: f.seo_description || null,
  og_media_id: f.og_media_id,
  canonical_url: f.canonical_url || null,
  noindex: f.noindex,
});

export default function PostEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { form, set, errors, loading, saving, loadError, dirty, save, record, isNew } = useResourceForm({ endpoint: '/admin/posts', id, empty: EMPTY, toForm, toPayload });
  const [categories, setCategories] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [gallery, setGallery] = useState(false);

  useEffect(() => {
    api.get('/admin/categories', { all: 1 }).then((r) => setCategories(r.data)).catch(() => {});
    api.get('/admin/tags', { all: 1 }).then((r) => setTagSuggestions(r.data.map((t) => t.name))).catch(() => {});
    if (isAdmin) api.get('/admin/users', { per_page: 100 }).then((r) => setUsers(r.data)).catch(() => {});
  }, [isAdmin]);

  if (loading) return <div className="center pad"><Spinner /></div>;
  if (loadError) return <ErrorBox error={loadError} />;

  const onTitle = (v) => {
    set('title', v);
    if (isNew && !slugTouched) set('slug', slugify(v));
  };

  const submit = async (status) => {
    const saved = await save(status ? { status } : {});
    if (saved && isNew) navigate(`/posts/${saved.id}`, { replace: true });
  };

  const toggleCat = (cid) => set('category_ids', form.category_ids.includes(cid) ? form.category_ids.filter((x) => x !== cid) : [...form.category_ids, cid]);
  const moveImage = (i, dir) => {
    const next = [...form.images];
    const [m] = next.splice(i, 1);
    next.splice(i + dir, 0, m);
    set('images', next);
  };
  const path = `/${form.slug || 'your-post'}/`;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="editor-page">
      <PageHeader
        back="/posts"
        title={isNew ? 'New post' : 'Edit post'}
        subtitle={!isNew && record && <>Last saved {formatDate(record.updated_at, true)} · <StatusBadge status={record.status} /></>}
        actions={
          <>
            {!isNew && record?.status === 'published' && <a className="btn btn-ghost" href={SITE_URL + record.path} target="_blank" rel="noopener noreferrer">View on site ↗</a>}
            {dirty && <span className="unsaved">Unsaved changes</span>}
          </>
        }
      />

      <div className="editor-grid">
        <div className="editor-main">
          <Field label="Title" htmlFor="title" error={errors.title} required>
            <input id="title" className="input input-lg" value={form.title} onChange={(e) => onTitle(e.target.value)} maxLength={255} autoFocus={isNew} />
          </Field>
          <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={<>Address: {SITE_URL}{path}{!isNew && record?.slug !== form.slug && ' · the old address will redirect here automatically'}</>}>
            <div className="input-prefix">
              <span>/</span>
              <input id="slug" className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
            </div>
          </Field>
          <Field label="Content" error={errors.content}>
            <RichTextEditor value={form.content} onChange={(v) => set('content', v)} folder="posts" />
          </Field>
          <Field label="Excerpt" htmlFor="excerpt" error={errors.excerpt} hint="Optional short summary used in listings and as the default meta description.">
            <textarea id="excerpt" className="input" rows={3} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} maxLength={1000} />
          </Field>

          <Card title="Post gallery" actions={<button type="button" className="btn btn-sm btn-ghost" onClick={() => setGallery(true)}>+ Add images</button>}>
            {form.images.length === 0 ? (
              <p className="muted">Images attached to this post (in addition to images placed in the content).</p>
            ) : (
              <ul className="media-grid media-grid-sm">
                {form.images.map((m, i) => (
                  <li key={m.id} className="media-tile-static">
                    <img src={m.variants?.thumb || m.url} alt={m.alt || ''} />
                    <div className="tile-tools">
                      <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)} aria-label="Move left">‹</button>
                      <button type="button" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)} aria-label="Move right">›</button>
                      <button type="button" onClick={() => set('images', form.images.filter((x) => x.id !== m.id))} aria-label="Remove">×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Search engine & social">
            <SeoFields form={form} set={set} errors={errors} previewTitle={form.title} previewPath={path} fallbackDescription={form.excerpt || stripHtml(form.content)} siteUrl={SITE_URL} />
          </Card>
        </div>

        <aside className="editor-side">
          <Card title="Publish">
            <Field label="Status" htmlFor="status">
              <select id="status" className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field label="Publish date" htmlFor="published_at" error={errors.published_at} hint="Leave empty to use the time it is published.">
              <input id="published_at" type="datetime-local" className="input" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} />
            </Field>
            <Toggle id="is_featured" checked={form.is_featured} onChange={(v) => set('is_featured', v)} label="Featured post" />
            <div className="side-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Save' : 'Update'}</button>
              {form.status !== 'published' ? (
                <button type="button" className="btn" disabled={saving} onClick={() => submit('published')}>Save & publish</button>
              ) : (
                <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => submit('draft')}>Unpublish</button>
              )}
            </div>
          </Card>

          <Card title="Categories">
            {categories.length === 0 && <p className="muted">No categories yet.</p>}
            <div className="check-list">
              {categories.map((c) => (
                <label key={c.id} className="check">
                  <input type="checkbox" checked={form.category_ids.includes(c.id)} onChange={() => toggleCat(c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
            {errors.category_ids && <p className="field-error">{errors.category_ids[0]}</p>}
          </Card>

          <Card title="Tags">
            <TagInput id="post-tags" value={form.tags} onChange={(v) => set('tags', v)} suggestions={tagSuggestions} />
          </Card>

          <Card title="Featured image">
            <ImageField value={form.featured_media} folder="posts" onChange={(m) => { set('featured_media', m); set('featured_media_id', m?.id || null); }} label="Set featured image" />
            <p className="hint">If empty, the first image in the content is used on the blog.</p>
          </Card>

          {isAdmin && users.length > 0 && (
            <Card title="Author">
              <select className="input" value={form.author_id || ''} onChange={(e) => set('author_id', e.target.value ? Number(e.target.value) : null)} aria-label="Author">
                <option value="">—</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Card>
          )}
        </aside>
      </div>
      {gallery && (
        <MediaPicker multiple folder="posts" onClose={() => setGallery(false)} onSelect={(picked) => set('images', [...form.images, ...picked.filter((p) => !form.images.some((m) => m.id === p.id))])} />
      )}
    </form>
  );
}
