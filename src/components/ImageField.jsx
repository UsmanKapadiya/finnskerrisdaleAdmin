import { useState } from 'react';
import MediaPicker from './MediaPicker';

/** A single image picked from the media library (featured image, logo, OG image…). */
export default function ImageField({ value, onChange, folder = 'general', label = 'Choose image' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="image-field">
      {value ? (
        <div className="image-field-preview">
          <img src={value.variants?.medium || value.url} alt={value.alt || ''} />
          <div className="image-field-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(true)}>Change</button>
            <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => onChange(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="image-field-empty" onClick={() => setOpen(true)}>+ {label}</button>
      )}
      {open && <MediaPicker folder={folder} onClose={() => setOpen(false)} onSelect={(m) => onChange(m[0])} />}
    </div>
  );
}
