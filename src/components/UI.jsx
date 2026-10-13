import { Link } from 'react-router-dom';

export function Spinner({ small }) {
  return <span className={`spinner ${small ? 'spinner-sm' : ''}`} role="status" aria-label="Loading" />;
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-header">
      <div>
        {back && <Link to={back} className="back-link">← Back</Link>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const tone = { published: 'green', draft: 'gray', confirmed: 'green', pending: 'amber', unsubscribed: 'gray' }[status] || 'neutral';
  return <Badge tone={tone}>{status}</Badge>;
}

export function Field({ label, error, hint, children, required, htmlFor, className = '' }) {
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{Array.isArray(error) ? error[0] : error}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      <span>{label}</span>
    </label>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Card({ title, children, actions, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      {error.message || String(error)}
      {onRetry && <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>Retry</button>}
    </div>
  );
}
