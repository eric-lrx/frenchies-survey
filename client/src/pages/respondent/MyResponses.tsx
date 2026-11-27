import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, formatDateTime, STATUS_LABELS, type MyResponseItem } from "../../api.js";
import { Loading, LoadError } from "../../components/Feedback.js";

export default function MyResponses() {
  const [responses, setResponses] = useState<MyResponseItem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    setResponses(null);
    api
      .listMyResponses()
      .then(setResponses)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Your responses could not be loaded."));
  }, []);

  useEffect(load, [load]);

  if (error) return <LoadError message={error} onRetry={load} />;
  if (!responses) return <Loading label="Loading your responses..." />;

  return (
    <section>
      <h1 className="h4 mb-3">My responses</h1>
      {responses.length === 0 ? (
        <p className="text-body-secondary">You have not answered any survey yet.</p>
      ) : (
        <ul className="list-unstyled" role="list">
          {responses.map((r) => (
            <li key={r.id} className="cf-card mb-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Link to={`/responses/${r.id}`} className="fw-semibold">
                  {r.surveyTitle}
                </Link>
                <span className={`badge bg-${r.surveyStatus === "PUBLISHED" ? "success" : "secondary"}`}>
                  {STATUS_LABELS[r.surveyStatus]}
                </span>
              </div>
              <p className="text-body-secondary small mb-0">Answered {formatDateTime(r.submittedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
