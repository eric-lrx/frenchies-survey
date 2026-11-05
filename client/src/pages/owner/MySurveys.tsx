import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, formatDateTime, type SurveyListItem } from "../../api.js";
import StatusBadge from "../../components/StatusBadge.js";
import { Loading, LoadError } from "../../components/Feedback.js";

// F-03 "My surveys" (contract v1.1, section 3).
export default function MySurveys() {
  const [surveys, setSurveys] = useState<SurveyListItem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    setSurveys(null);
    api
      .listSurveys()
      .then(setSurveys)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Your surveys could not be loaded."));
  }, []);

  useEffect(load, [load]);

  return (
    <section aria-labelledby="my-surveys-title">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 id="my-surveys-title" className="h4 mb-0 me-auto">
          My surveys
        </h1>
        <Link to="/owner/surveys/new" className="btn btn-cafe">
          New survey
        </Link>
      </div>

      {error && <LoadError message={error} onRetry={load} />}
      {!error && surveys === null && <Loading label="Loading your surveys…" />}
      {surveys?.length === 0 && (
        <div className="cf-panel">
          <p className="mb-0">You have no surveys yet. Create one with “New survey”.</p>
        </div>
      )}
      {surveys && surveys.length > 0 && (
        <div className="table-responsive cf-panel p-0">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Questions</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link to={`/owner/surveys/${s.id}`}>{s.title}</Link>
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td>{s.questionCount}</td>
                  <td>{formatDateTime(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
