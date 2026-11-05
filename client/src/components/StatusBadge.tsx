import { STATUS_LABELS, type SurveyStatus } from "../api.js";

// The status is written out, so it never depends on colour alone (NFR-07).
export default function StatusBadge({ status }: { status: SurveyStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{STATUS_LABELS[status]}</span>;
}
