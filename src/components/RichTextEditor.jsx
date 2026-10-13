import { useEffect, useRef, useState } from 'react';
import MediaPicker from './MediaPicker';

const WIDGETS = [
  ['contact-details', 'Contact details'],
  ['subscribe', 'Email subscription form'],
  ['map', 'Google map'],
  ['brands', 'Designer brand logos'],
  ['contact-form', 'Contact form'],
];

/**
 * Lightweight WYSIWYG editor (no external dependency): formatting toolbar, links, lists,
 * images from the media library, site widgets, and an HTML source view.
 * The HTML is sanitized again by Laravel on save.
 */
export default function RichTextEditor({ value, onChange, folder = 'posts', allowWidgets = false, minHeight = 360 }) {
  const ref = useRef(null);
  const [source, setSource] = useState(false);
  const [picker, setPicker] = useState(false);
  const savedRange = useRef(null);

  // Only push external changes into the editable area (typing must not reset the caret).
  useEffect(() => {
    if (!source && ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value, source]);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    if (html !== (value || '')) onChange(html);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount && ref.current.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    ref.current.focus();
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const exec = (cmd, arg = null) => {
    restoreSelection();
    document.execCommand(cmd, false, arg);
    emit();
    saveSelection();
  };

  const insertHtml = (html) => {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  const link = () => {
    saveSelection();
    const url = window.prompt('Link address (https://… or /page/)');
    if (url === null) return;
    if (url === '') exec('unlink');
    else if (/^(https?:|mailto:|tel:|\/|#)/i.test(url)) exec('createLink', url);
    else exec('createLink', `https://${url}`);
  };

  const insertImages = (media) => {
    const html = media.map((m) => {
      const src = m.width > 1200 && m.variants?.large ? m.variants.large : m.url;
      const caption = m.caption ? `<figcaption>${m.caption}</figcaption>` : '';
      return `<figure class="wp-block-image"><a href="${m.url}"><img src="${src}" alt="${(m.alt || '').replace(/"/g, '&quot;')}" width="${m.width || ''}" height="${m.height || ''}"></a>${caption}</figure><p><br></p>`;
    }).join('');
    insertHtml(html);
  };

  const insertWidget = (name) => {
    if (!name) return;
    insertHtml(`<div data-widget="${name}" class="widget-placeholder" contenteditable="false">[${name}]</div><p><br></p>`);
  };

  const Btn = ({ cmd, arg, label, title, onClick }) => (
    <button
      type="button"
      className="rte-btn"
      title={title || label}
      aria-label={title || label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick || (() => exec(cmd, arg))}
      disabled={source}
    >
      {label}
    </button>
  );

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <select
          className="rte-select"
          aria-label="Block style"
          disabled={source}
          onMouseDown={saveSelection}
          onChange={(e) => { exec('formatBlock', e.target.value); e.target.value = ''; }}
          defaultValue=""
        >
          <option value="" disabled>Style</option>
          <option value="P">Paragraph</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
          <option value="H4">Heading 4</option>
          <option value="BLOCKQUOTE">Quote</option>
        </select>
        <Btn cmd="bold" label={<b>B</b>} title="Bold" />
        <Btn cmd="italic" label={<i>I</i>} title="Italic" />
        <Btn cmd="underline" label={<u>U</u>} title="Underline" />
        <span className="rte-sep" />
        <Btn cmd="insertUnorderedList" label="• List" title="Bulleted list" />
        <Btn cmd="insertOrderedList" label="1. List" title="Numbered list" />
        <span className="rte-sep" />
        <Btn cmd="justifyLeft" label="⯇" title="Align left" />
        <Btn cmd="justifyCenter" label="≡" title="Center" />
        <span className="rte-sep" />
        <Btn label="🔗 Link" title="Insert link" onClick={link} />
        <Btn label="🖼 Image" title="Insert image from media library" onClick={() => { saveSelection(); setPicker(true); }} />
        <Btn cmd="insertHorizontalRule" label="―" title="Divider" />
        <Btn cmd="removeFormat" label="⨯ Format" title="Clear formatting" />
        {allowWidgets && (
          <select className="rte-select" aria-label="Insert widget" disabled={source} onMouseDown={saveSelection} value="" onChange={(e) => insertWidget(e.target.value)}>
            <option value="">+ Widget</option>
            {WIDGETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        )}
        <span className="rte-spacer" />
        <button type="button" className={`rte-btn ${source ? 'is-active' : ''}`} onClick={() => setSource((s) => !s)}>
          {source ? 'Visual' : '</> HTML'}
        </button>
      </div>
      {source ? (
        <textarea
          className="rte-source"
          style={{ minHeight }}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="HTML source"
        />
      ) : (
        <div
          ref={ref}
          className="rte-area entry-content"
          style={{ minHeight }}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Content"
          onInput={emit}
          onBlur={() => { saveSelection(); emit(); }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onPaste={(e) => {
            // paste as clean text unless it's an image-free simple HTML fragment
            const text = e.clipboardData.getData('text/plain');
            if (e.clipboardData.types.includes('text/html')) {
              e.preventDefault();
              document.execCommand('insertText', false, text);
            }
          }}
        />
      )}
      {picker && <MediaPicker multiple folder={folder} onClose={() => setPicker(false)} onSelect={insertImages} />}
    </div>
  );
}
