import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useResourceForm from '../../hooks/useResourceForm';
import { SITE_URL } from '../../services/api';
import { PageHeader, Field, Card, Spinner, ErrorBox, StatusBadge } from '../../components/UI';
import RichTextEditor from '../../components/RichTextEditor';
import ImageField from '../../components/ImageField';
import SeoFields from '../../components/SeoFields';
import { formatDate, fromLocalInput, slugify, stripHtml, toLocalInput } from '../../utils/format';
import { TEMPLATE_LABELS } from './PagesPage';

const TEMPLATE_HELP = {
  default: 'Title banner, content and the blog sidebar.',
  home: 'Shown at the site root (/). The content appears under the hero banner.',
  about: 'Content with the store details column.',
  designer: 'Content followed by the active designer brand logos (managed under Designers).',
  blog: 'The Latest News listing. Content is optional intro text above the posts.',
  contact: 'Use the widget buttons to place contact details, the map and the subscribe form.',
};

const EMPTY = {
  title: '', slug: '', template: 'default', content: '', status: 'draft', published_at: '', menu_order: 0,
  featured_media: null, featured_media_id: null,
  seo_title: '', seo_description: '', og_media: null, og_media_id: null, canonical_url: '', noindex: false,
};

const toForm = (p) => ({
  ...EMPTY,
  title: p.title || '',
  slug: p.slug || '',
  template: p.template || 'default',
  content: p.content || '',
  status: p.status,
  published_at: toLocalInput(p.published_at),
  menu_order: p.menu_order ?? 0,
  featured_media: p.featured_media || null,
  featured_media_id: p.featured_media_id,
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
  template: f.template,
  content: f.content,
  status: f.status,
  published_at: fromLocalInput(f.published_at),
  menu_order: Number(f.menu_order) || 0,
  featured_media_id: f.featured_media_id,
  seo_title: f.seo_title || null,
  seo_description: f.seo_description || null,
  og_media_id: f.og_media_id,
  canonical_url: f.canonical_url || null,
  noindex: f.noindex,
});

export default function PageEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { form, set, errors, loading, saving, loadError, dirty, save, record, isNew } = useResourceForm({ endpoint: '/admin/pages', id, empty: EMPTY, toForm, toPayload });
  const [slugTouched, setSlugTouched] = useState(false);

  if (loading) return <div className="center pad"><Spinner /></div>;
  if (loadError) return <ErrorBox error={loadError} />;

  const submit = async (status) => {
    const saved = await save(status ? { status } : {});
    if (saved && isNew) navigate(`/pages/${saved.id}`, { replace: true });
  };
  const path = form.template === 'home' ? '/' : `/${form.slug || 'your-page'}/`;

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="editor-page">
      <PageHeader
        back="/pages"
        title={isNew ? 'New page' : `Edit page: ${record?.title || ''}`}
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
            <input id="title" className="input input-lg" value={form.title} onChange={(e) => { set('title', e.target.value); if (isNew && !slugTouched) set('slug', slugify(e.target.value)); }} />
          </Field>
          {form.template !== 'home' && (
            <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={<>Address: {SITE_URL}{path}{!isNew && record?.slug !== form.slug && ' · the old address will redirect here automatically'}</>}>
              <div className="input-prefix">
                <span>/</span>
                <input id="slug" className="input" value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
              </div>
            </Field>
          )}
          <Field label="Content" error={errors.content}>
            <RichTextEditor value={form.content} onChange={(v) => set('content', v)} folder="pages" allowWidgets minHeight={420} />
          </Field>
          <Card title="Search engine & social">
            <SeoFields form={form} set={set} errors={errors} previewTitle={form.title} previewPath={path} fallbackDescription={stripHtml(form.content)} siteUrl={SITE_URL} />
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
            <Field label="Publish date" htmlFor="published_at" error={errors.published_at}>
              <input id="published_at" type="datetime-local" className="input" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} />
            </Field>
            <div className="side-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Save' : 'Update'}</button>
              {form.status !== 'published'
                ? <button type="button" className="btn" disabled={saving} onClick={() => submit('published')}>Save & publish</button>
                : form.template !== 'home' && <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => submit('draft')}>Unpublish</button>}
            </div>
          </Card>
          <Card title="Layout">
            <Field label="Template" htmlFor="template" error={errors.template} hint={TEMPLATE_HELP[form.template]}>
              <select id="template" className="input" value={form.template} onChange={(e) => set('template', e.target.value)}>
                {Object.entries(TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Order" htmlFor="menu_order" hint="Lower numbers come first in lists.">
              <input id="menu_order" type="number" min="0" className="input" value={form.menu_order} onChange={(e) => set('menu_order', e.target.value)} />
            </Field>
          </Card>
          <Card title="Banner / featured image">
            <ImageField value={form.featured_media} folder="pages" onChange={(m) => { set('featured_media', m); set('featured_media_id', m?.id || null); }} label="Set image" />
          </Card>
        </aside>
      </div>
    </form>
  );
}
