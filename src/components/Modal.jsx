import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  // keep the latest onClose without re-running the mount effect (callers pass inline functions)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      // only the top-most modal reacts to Escape
      const all = document.querySelectorAll('.modal');
      if (e.key === 'Escape' && all[all.length - 1] === ref.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      if (!document.querySelector('.modal')) document.body.classList.remove('modal-open');
      else document.body.classList.add('modal-open');
      prev?.focus?.({ preventScroll: true });
    };
  }, []);

  // portal to <body> so a modal opened from a sticky sidebar or toolbar is never clipped or covered
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

const ConfirmContext = createContext(async () => false);

/** const confirm = useConfirm(); if (await confirm({ title, message, danger: true })) ... */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title || 'Are you sure?'}
          size="sm"
          onClose={() => close(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>Cancel</button>
              <button type="button" className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
                {dialog.confirmLabel || (dialog.danger ? 'Delete' : 'Confirm')}
              </button>
            </>
          }
        >
          <p>{dialog.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
