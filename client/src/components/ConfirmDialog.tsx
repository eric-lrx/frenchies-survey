import { useEffect, useRef, type KeyboardEvent } from "react";

// Accessible confirmation dialog (F-04 contract, section 3): focus moves into the dialog,
// Tab stays inside it, Escape cancels, and the caller returns focus to its trigger.
interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel, busy = false, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Tab") {
      // Two buttons: Tab and Shift+Tab move between them only.
      e.preventDefault();
      (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
    }
  }

  return (
    <div className="cf-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="cf-dialog" onKeyDown={handleKeyDown}>
        <h2 id="confirm-title" className="h5">
          {title}
        </h2>
        <p id="confirm-message">{message}</p>
        <div className="d-flex justify-content-end gap-2">
          <button ref={cancelRef} type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className="btn btn-cafe" onClick={onConfirm} disabled={busy}>
            {busy ? "Publishing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
