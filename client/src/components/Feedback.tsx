// Shared loading and error states (docs/system-sds.md, section 3).

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="text-body-secondary" role="status">
      {label}
    </p>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="cf-panel">
      <p className="text-danger mb-2">{message}</p>
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
