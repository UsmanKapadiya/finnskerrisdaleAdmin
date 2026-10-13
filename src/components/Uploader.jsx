import { useRef, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';

const FOLDERS = ['general', 'posts', 'pages', 'galleries', 'gallery-photos', 'brands', 'users'];

// Matches IMAGE_MAX_WIDTH / IMAGE_MAX_HEIGHT on the server.
const MAX_SIDE = Number(import.meta.env.VITE_IMAGE_MAX_SIDE) || 2000;
const PRESHRINK_BYTES = 1.5 * 1024 * 1024;

/**
 * Big camera photos (often 5–15 MB) are scaled down to the site's maximum size in the browser
 * before upload, so they fit within PHP's upload limit and upload faster. Laravel still does
 * the real optimisation (WebP, quality, thumbnail/medium/large sizes). GIFs are left alone.
 */
async function preshrink(file) {
  if (file.size < PRESHRINK_BYTES || !/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 8 * 1024 * 1024) { bmp.close?.(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(jpe?g|png|webp)$/i, '') + (type === 'image/png' ? '.png' : '.jpg'), { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Drag & drop / click-to-browse uploader. Images are compressed and converted by Laravel. */
export default function Uploader({ folder: initialFolder = 'general', onUploaded, compact }) {
  const input = useRef(null);
  const [folder, setFolder] = useState(initialFolder);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const toast = useToast();

  const upload = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      toast('Please choose JPG, PNG, WebP or GIF images.', 'error');
      return;
    }
    setBusy(true);
    const uploaded = [];
    const originalBytes = files.reduce((n, f) => n + f.size, 0);
    try {
      files.splice(0, files.length, ...(await Promise.all(files.map(preshrink))));
      // send in small batches (max 10 files / ~6 MB) so each request stays under PHP's post_max_size
      const batches = [];
      files.forEach((f) => {
        const last = batches[batches.length - 1];
        if (last && last.length < 10 && last.reduce((n, x) => n + x.size, 0) + f.size <= 6 * 1024 * 1024) last.push(f);
        else batches.push([f]);
      });
      for (const batch of batches) {
        const fd = new FormData();
        batch.forEach((f) => fd.append('files[]', f));
        fd.append('folder', folder);
        const res = await api.upload('/admin/media', fd);
        uploaded.push(...(Array.isArray(res.data) ? res.data : [res.data]));
        if (res.meta?.errors) {
          Object.values(res.meta.errors).flat().forEach((m) => toast(m, 'error'));
        }
      }
      const saved = Math.max(0, originalBytes - uploaded.reduce((s, m) => s + (m.size_bytes || 0), 0));
      if (uploaded.length) toast(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded${saved > 0 ? ` · ${(saved / 1024 / 1024).toFixed(1)} MB saved by compression` : ''}`);
      onUploaded?.(uploaded);
    } catch (err) {
      const msg = Object.values(err.errors || {}).flat()[0] || err.message;
      toast(msg, 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div
      className={`uploader ${drag ? 'is-drag' : ''} ${compact ? 'uploader-compact' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
      <p className="uploader-title">{busy ? 'Uploading and optimising…' : 'Drop images here'}</p>
      <p className="uploader-sub">JPG, PNG, WebP or GIF · resized to max 2000px · saved as WebP</p>
      <div className="uploader-actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Uploading…' : 'Choose files'}
        </button>
        <label className="inline-label">
          Folder{' '}
          <select className="input input-sm" value={folder} onChange={(e) => setFolder(e.target.value)}>
            {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

export { FOLDERS };
