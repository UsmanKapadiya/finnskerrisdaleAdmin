import { useState } from 'react';

/** Free-text tags: type and press Enter or comma. */
export default function TagInput({ value = [], onChange, suggestions = [], id }) {
  const [text, setText] = useState('');
  const add = (t) => {
    const v = t.trim().replace(/,$/, '');
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText('');
  };
  return (
    <div className="tag-input">
      {value.map((t) => (
        <span key={t} className="tag-chip">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
        </span>
      ))}
      <input
        id={id}
        list={id ? `${id}-list` : undefined}
        value={text}
        placeholder={value.length ? '' : 'Add tags…'}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(text); }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text && add(text)}
      />
      {id && (
        <datalist id={`${id}-list`}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}
