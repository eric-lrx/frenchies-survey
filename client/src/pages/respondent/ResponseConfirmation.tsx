import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, formatDateTime, type ResponseDetail } from "../../api.js";
import { Loading, LoadError } from "../../components/Feedback.js";

// F-06 confirmation (contract section 3): the respondent's own answers, with the time in
// Asia/Bangkok. Another respondent's response is "not found" (F-02).
export default function ResponseConfirmation() {
  const { id } = useParams();
  const [response, setResponse] = useState<ResponseDetail | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setError("");
    setNotFound(false);
    setResponse(null);
    api
      .getResponse(Number(id))
      .then(setResponse)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "Your response could not be loaded.");
      });
  }, [id]);

  useEffect(load, [load]);

  if (notFound) {
    return (
      <div className="cf-panel">
        <p>This response is not available.</p>
        <Link to="/surveys">Back to open surveys</Link>
      </div>
    );
  }
  if (error) return <LoadError message={error} onRetry={load} />;
  if (!response) return <Loading label="Loading your response…" />;

  return (
    <section aria-labelledby="thanks-title" className="cf-panel">
      <h1 id="thanks-title" className="h4">
        Thank you, your response was recorded
      </h1>
      <p className="text-body-secondary">
        {response.surveyTitle} · {formatDateTime(response.submittedAt)}
      </p>
      <h2 className="h6">Your answers</h2>
      <dl className="answer-list">
        {response.answers.map((a) => (
          <div key={a.questionId}>
            <dt>{a.questionText}</dt>
            <dd>{a.type === "RATING" ? `${a.ratingValue} / 5` : a.optionLabel}</dd>
          </div>
        ))}
      </dl>
      <Link to="/surveys" className="btn btn-outline-secondary btn-sm">
        Back to open surveys
      </Link>
    </section>
  );
}
