import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from './Modal';
import { Spinner } from './UI';
import Uploader, { FOLDERS } from './Uploader';
import { SearchInput } from './DataTable';

/**
 * Choose existing images (or upload new ones) from the media library.
 * onSelect receives an array of media objects (one item unless `multiple`).
 */
export default function MediaPicker({ onClose, onSelect, multiple = false, folder = 'general' }) {
  const [q, setQ] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/media', { q, folder: filterFolder, page, per_page: 30 })
      .then((res) => {
        setItems((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
        setMeta(res.meta);
      })
      .finally(() => setLoading(false));
  }, [q, filterFolder, page]);

  const toggle = (m) => {
    if (!multiple) {
      setPicked([m]);
      return;
    }
    setPicked((p) => (p.some((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));
  };

  const onUploaded = (media) => {
    setItems((prev) => [...media, ...prev]);
    setPicked((p) => (multiple ? [...p, ...media] : media.slice(0, 1)));
  };

  return (
    <Modal
      title={multiple ? 'Select images' : 'Select an image'}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <span className="muted">{picked.length ? `${picked.length} selected` : 'Click an image to select it'}</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!picked.length} onClick={() => { onSelect(picked); onClose(); }}>
            {multiple ? 'Add selected' : 'Use this image'}
          </button>
        </>
      }
    >
      <Uploader folder={folder} compact onUploaded={onUploaded} />
      <div className="toolbar">
        <SearchInput value={q} onChange={(v) => { setPage(1); setQ(v); }} placeholder="Search images…" />
        <select className="input" value={filterFolder} onChange={(e) => { setPage(1); setFilterFolder(e.target.value); }} aria-label="Folder">
          <option value="">All folders</option>
          {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <ul className="media-grid media-grid-picker">
        {items.map((m) => {
          const on = picked.some((x) => x.id === m.id);
          return (
            <li key={m.id}>
              <button type="button" className={`media-tile ${on ? 'is-picked' : ''}`} onClick={() => toggle(m)} aria-pressed={on} title={m.original_name}>
                <img src={m.variants?.thumb || m.url} alt={m.alt || ''} loading="lazy" />
                {on && <span className="media-check">✓</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {loading && <div className="center"><Spinner /></div>}
      {!loading && !items.length && <p className="muted center">No images found.</p>}
      {meta && meta.current_page < meta.last_page && !loading && (
        <div className="center"><button type="button" className="btn btn-ghost" onClick={() => setPage((p) => p + 1)}>Load more</button></div>
      )}
    </Modal>
  );
}
