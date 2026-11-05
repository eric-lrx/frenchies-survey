import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type OpenSurveyDetail } from "../../api.js";
import { Loading, LoadError } from "../../components/Feedback.js";

// F-05 survey page for a respondent (contract v1.1, section 3): the questions read-only.
// F-06 turns it into the answer form.
export default function SurveyPage() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<OpenSurveyDetail | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setError("");
    setNotFound(false);
    setSurvey(null);
    api
      .getOpenSurvey(Number(id))
      .then(setSurvey)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "The survey could not be loaded.");
      });
  }, [id]);

  useEffect(load, [load]);

  if (notFound) {
    return (
      <div className="cf-panel">
        <p>This survey is not available.</p>
        <Link to="/surveys">Back to open surveys</Link>
      </div>
    );
  }
  if (error) return <LoadError message={error} onRetry={load} />;
  if (!survey) return <Loading label="Loading the survey…" />;

  return (
    <section aria-labelledby="survey-title">
      <p className="mb-2">
        <Link to="/surveys">← Open surveys</Link>
      </p>
      <h1 id="survey-title" className="h4">
        {survey.title}
      </h1>
      {survey.description && <p>{survey.description}</p>}
      <ol className="question-list">
        {survey.questions.map((q) => (
          <li key={q.id} className="question-item">
            <p className="mb-1 fw-semibold">{q.text}</p>
            {q.type === "RATING" ? (
              <p className="mb-0 text-body-secondary small">Rating from 1 (very poor) to 5 (excellent)</p>
            ) : (
              <ul className="mb-0">
                {q.options.map((o) => (
                  <li key={o.id}>{o.label}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
