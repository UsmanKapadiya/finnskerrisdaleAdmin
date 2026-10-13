import { Field, Toggle } from './UI';
import ImageField from './ImageField';

/** SEO box shared by pages and posts, with a Google-style preview. */
export default function SeoFields({ form, set, errors = {}, previewTitle, previewPath, fallbackDescription, siteUrl }) {
  const title = form.seo_title || previewTitle || '';
  const desc = form.seo_description || fallbackDescription || '';
  return (
    <div className="seo-fields">
      <div className="serp" aria-label="Search result preview">
        <div className="serp-url">{siteUrl}{previewPath}</div>
        <div className="serp-title">{title ? `${title}${form.seo_title ? '' : ' - Finns Kerrisdale Ladies'}` : 'Untitled'}</div>
        <div className="serp-desc">{desc.slice(0, 160) || 'Add a description to control how this appears in Google.'}</div>
      </div>
      <Field label="SEO title" htmlFor="seo_title" error={errors.seo_title} hint={`${(form.seo_title || '').length}/60 · leave empty to use the title`}>
        <input id="seo_title" className="input" value={form.seo_title || ''} onChange={(e) => set('seo_title', e.target.value)} maxLength={255} />
      </Field>
      <Field label="Meta description" htmlFor="seo_description" error={errors.seo_description} hint={`${(form.seo_description || '').length}/155 · leave empty to use the first lines of the content`}>
        <textarea id="seo_description" className="input" rows={3} value={form.seo_description || ''} onChange={(e) => set('seo_description', e.target.value)} maxLength={500} />
      </Field>
      <Field label="Social share image (Open Graph)" hint="Defaults to the featured image or first image in the content">
        <ImageField value={form.og_media} onChange={(m) => { set('og_media', m); set('og_media_id', m?.id || null); }} label="Choose share image" />
      </Field>
      <Field label="Canonical URL" htmlFor="canonical_url" error={errors.canonical_url} hint="Only if this content officially lives at another address">
        <input id="canonical_url" className="input" value={form.canonical_url || ''} onChange={(e) => set('canonical_url', e.target.value)} placeholder="https://" />
      </Field>
      <Toggle id="noindex" checked={form.noindex} onChange={(v) => set('noindex', v)} label="Hide from search engines (noindex)" />
    </div>
  );
}
