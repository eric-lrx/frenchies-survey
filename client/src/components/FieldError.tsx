// A validation message placed next to its field; the field points to it with
// aria-describedby so screen readers read the message with the field (NFR-07).
export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}
