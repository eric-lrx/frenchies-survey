import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type OpenSurvey } from "../../api.js";
import { Loading, LoadError } from "../../components/Feedback.js";

// F-05 "Open surveys" (contract v1.1, section 3), with the "Answered" badge of F-06.
export default function OpenSurveys() {
  const [surveys, setSurveys] = useState<OpenSurvey[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    setSurveys(null);
    api
      .listOpenSurveys()
      .then(setSurveys)
      .catch((err) => setError(err instanceof ApiError ? err.message : "The open surveys could not be loaded."));
  }, []);

  useEffect(load, [load]);

  return (
    <section aria-labelledby="open-surveys-title">
      <h1 id="open-surveys-title" className="h4 mb-3">
        Open surveys
      </h1>
      {error && <LoadError message={error} onRetry={load} />}
      {!error && surveys === null && <Loading label="Loading open surveys…" />}
      {surveys?.length === 0 && (
        <div className="cf-panel">
          <p className="mb-0">No survey is open right now.</p>
        </div>
      )}
      {surveys && surveys.length > 0 && (
        <ul className="survey-cards">
          {surveys.map((s) => (
            <li key={s.id} className="cf-panel survey-card">
              <h2 className="h6 mb-1">{s.title}</h2>
              {s.description && <p className="mb-2 text-body-secondary">{s.description}</p>}
              <div className="d-flex align-items-center gap-2">
                <span className="small text-body-secondary me-auto">
                  {s.questionCount} {s.questionCount === 1 ? "question" : "questions"}
                </span>
                {s.alreadyResponded ? (
                  <span className="status-badge status-answered">Answered</span>
                ) : (
                  <Link to={`/surveys/${s.id}`} className="btn btn-cafe btn-sm" aria-label={`Answer ${s.title}`}>
                    Answer
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
