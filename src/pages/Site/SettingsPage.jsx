import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { PageHeader, Field, Card, Toggle, Spinner, ErrorBox } from '../../components/UI';
import ImageField from '../../components/ImageField';
import { setFavicon } from '../../utils/favicon';

/** How each setting is edited. Unknown keys fall back to a text input. */
const FIELDS = {
  site_name: { label: 'Site name' },
  tagline: { label: 'Tagline', hint: 'Shown under the logo and used as the default description.' },
  logo_url: { label: 'Logo', type: 'image' },
  favicon_url: { label: 'Favicon', type: 'image' },
  copyright_text: { label: 'Footer copyright', hint: '{year} is replaced with the current year.' },
  posts_per_page: { label: 'Posts per blog page', type: 'number' },
  address: { label: 'Full address (one line)' },
  address_street: { label: 'Street' },
  address_city: { label: 'City' },
  address_region: { label: 'Province' },
  address_postal_code: { label: 'Postal code' },
  address_country: { label: 'Country code' },
  phone: { label: 'Phone' },
  email: { label: 'Public email', type: 'email' },
  hours: { label: 'Store hours', type: 'hours' },
  hours_note: { label: 'Hours note', hint: 'e.g. holiday hours' },
  map_embed_url: { label: 'Google Maps embed URL', type: 'textarea', hint: 'Google Maps → Share → Embed a map → copy the src="…" address.' },
  opening_hours_schema: { label: 'Opening hours for Google (structured data)', type: 'json', hint: 'Advanced — schema.org OpeningHoursSpecification list.' },
  social_links: { label: 'Social media links', type: 'links' },
  subscribe_title: { label: 'Subscribe box title' },
  subscribe_text: { label: 'Subscribe box text', type: 'textarea' },
  subscribe_button: { label: 'Subscribe button text' },
  contact_form_enabled: { label: 'Show the contact form on the Contact Us page', type: 'toggle' },
  notification_email: { label: 'Send contact-form messages to', type: 'email', hint: 'Private — not shown on the website.' },
  seo_default_description: { label: 'Default meta description', type: 'textarea' },
  og_default_image: { label: 'Default social share image', type: 'image' },
  google_site_verification: { label: 'Google Search Console verification code' },
};

const GROUP_TITLES = { general: 'General', contact: 'Store & contact details', forms: 'Forms', seo: 'Search engines' };

export default function SettingsPage() {
  const [groups, setGroups] = useState(null);
  const [values, setValues] = useState({});
  const [jsonText, setJsonText] = useState({});
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();

  const apply = (data) => {
    setGroups(data);
    const v = {};
    const j = {};
    Object.values(data).flat().forEach((s) => {
      v[s.key] = s.value;
      if (FIELDS[s.key]?.type === 'json') j[s.key] = JSON.stringify(s.value ?? [], null, 2);
    });
    setFavicon(v.favicon_url || null);
    setValues(v);
    setJsonText(j);
    setDirty(false);
  };

  useEffect(() => {
    api.get('/admin/settings').then((r) => apply(r.data)).catch(setLoadError);
  }, []);

  const set = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...values };
    for (const [k, text] of Object.entries(jsonText)) {
      try {
        payload[k] = JSON.parse(text || '[]');
      } catch {
        setErrors({ [`settings.${k}`]: ['This is not valid JSON.'] });
        toast('Please fix the highlighted fields.', 'error');
        return;
      }
    }
    if (payload.posts_per_page !== undefined) payload.posts_per_page = Math.max(1, parseInt(payload.posts_per_page, 10) || 10);
    setSaving(true);
    setErrors({});
    try {
      const res = await api.put('/admin/settings', { settings: payload });
      apply(res.data);
      toast(res.message);
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.status === 422 ? 'Please fix the highlighted fields.' : err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <ErrorBox error={loadError} />;
  if (!groups) return <div className="center pad"><Spinner /></div>;

  const order = ['general', 'contact', 'forms', 'seo', ...Object.keys(groups).filter((g) => !GROUP_TITLES[g])];

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Settings"
        subtitle="Site-wide details used in the header, footer, contact page and search results."
        actions={
          <>
            {dirty && <span className="unsaved">Unsaved changes</span>}
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
          </>
        }
      />
      <div className="settings-grid">
        {order.filter((g) => groups[g]).map((g) => (
          <Card key={g} title={GROUP_TITLES[g] || g}>
            {groups[g].map(({ key }) => (
              <SettingField
                key={key}
                k={key}
                def={FIELDS[key] || { label: key.replace(/_/g, ' ') }}
                value={values[key]}
                jsonText={jsonText[key]}
                onJson={(t) => { setJsonText((j) => ({ ...j, [key]: t })); setDirty(true); }}
                onChange={(v) => set(key, v)}
                error={errors[`settings.${key}`]}
              />
            ))}
          </Card>
        ))}
      </div>
      <div className="form-footer">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}

function SettingField({ k, def, value, onChange, error, jsonText, onJson }) {
  const id = `set-${k}`;
  switch (def.type) {
    case 'toggle':
      return <div className="field"><Toggle id={id} checked={!!value} onChange={onChange} label={def.label} />{error && <p className="field-error">{error[0]}</p>}</div>;
    case 'image':
      return (
        <Field label={def.label} error={error} hint={def.hint}>
          <ImageField value={value ? { url: value } : null} folder="general" onChange={(m) => onChange(m?.url || null)} />
        </Field>
      );
    case 'textarea':
      return <Field label={def.label} htmlFor={id} error={error} hint={def.hint}><textarea id={id} className="input" rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>;
    case 'json':
      return <Field label={def.label} htmlFor={id} error={error} hint={def.hint}><textarea id={id} className="input mono" rows={6} value={jsonText ?? ''} onChange={(e) => onJson(e.target.value)} /></Field>;
    case 'hours':
      return <ListEditor label={def.label} error={error} value={Array.isArray(value) ? value : []} onChange={onChange} cols={[['days', 'Days', 'Tue – Sat'], ['time', 'Hours', '10 – 5:30']]} />;
    case 'links':
      return <ListEditor label={def.label} error={error} value={Array.isArray(value) ? value : []} onChange={onChange} cols={[['label', 'Network', 'Facebook'], ['url', 'Link', 'https://']]} />;
    default:
      return (
        <Field label={def.label} htmlFor={id} error={error} hint={def.hint}>
          <input id={id} className="input" type={def.type || 'text'} min={def.type === 'number' ? 1 : undefined} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
  }
}

/** Small row editor for arrays of objects (store hours, social links). */
function ListEditor({ label, value, onChange, cols, error }) {
  const update = (i, key, v) => onChange(value.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  return (
    <div className="field">
      <label>{label}</label>
      <div className="list-editor">
        {value.map((row, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="list-editor-row">
            {cols.map(([key, l, ph]) => (
              <input key={key} className="input" aria-label={`${l} ${i + 1}`} placeholder={ph} value={row[key] ?? ''} onChange={(e) => update(i, key, e.target.value)} />
            ))}
            <button type="button" className="icon-btn danger" aria-label="Remove row" onClick={() => onChange(value.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange([...value, Object.fromEntries(cols.map(([key]) => [key, '']))])}>+ Add row</button>
      </div>
      {error && <p className="field-error">{error[0]}</p>}
    </div>
  );
}
