import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, formatDateTime, type SurveyDetail as Survey } from "../../api.js";
import StatusBadge from "../../components/StatusBadge.js";
import { Loading, LoadError } from "../../components/Feedback.js";
import ConfirmDialog from "../../components/ConfirmDialog.js";

// F-03 survey detail, read-only (contract section 3), with publication (F-04) and a link
// to the results (F-07).
export default function SurveyDetail() {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState("");
  const [publishError, setPublishError] = useState("");
  const publishButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    setError("");
    setNotFound(false);
    setSurvey(null);
    api
      .getSurvey(Number(id))
      .then(setSurvey)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "The survey could not be loaded.");
      });
  }, [id]);

  useEffect(load, [load]);

  function closeDialog() {
    setConfirming(false);
    // Focus goes back to the button that opened the dialog, if it is still there.
    requestAnimationFrame(() => publishButton.current?.focus());
  }

  async function publish() {
    if (!survey || publishing) return;
    setPublishing(true);
    setPublishError("");
    try {
      const result = await api.publishSurvey(survey.id);
      setSurvey({ ...survey, status: result.status, publishedAt: result.publishedAt });
      setNotice("The survey is published. Respondents can now answer it.");
      setConfirming(false);
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : "The survey could not be published.");
      closeDialog();
      if (err instanceof ApiError && err.status === 409) load();
    } finally {
      setPublishing(false);
    }
  }

  if (notFound) {
    return (
      <div className="cf-panel">
        <p>This survey does not exist or is not yours.</p>
        <Link to="/owner/surveys">Back to my surveys</Link>
      </div>
    );
  }
  if (error) return <LoadError message={error} onRetry={load} />;
  if (!survey) return <Loading label="Loading the survey…" />;

  return (
    <section aria-labelledby="survey-title">
      <p className="mb-2">
        <Link to="/owner/surveys">← My surveys</Link>
      </p>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h1 id="survey-title" className="h4 mb-0">
          {survey.title}
        </h1>
        <StatusBadge status={survey.status} />
        {survey.status === "DRAFT" ? (
          <button ref={publishButton} type="button" className="btn btn-cafe btn-sm ms-auto" onClick={() => setConfirming(true)}>
            Publish
          </button>
        ) : (
          <Link to={`/owner/surveys/${survey.id}/summary`} className="btn btn-outline-secondary btn-sm ms-auto">
            View results
          </Link>
        )}
      </div>
      <p role="status" className="text-success mb-2">
        {notice}
      </p>
      {publishError && (
        <p role="alert" className="text-danger">
          {publishError}
        </p>
      )}
      <p className="text-body-secondary small mb-3">
        Created {formatDateTime(survey.createdAt)}
        {survey.publishedAt && ` · Published ${formatDateTime(survey.publishedAt)}`}
      </p>
      {survey.description && <p>{survey.description}</p>}

      <h2 className="h6 mt-4">Questions</h2>
      <ol className="question-list">
        {survey.questions.map((q) => (
          <li key={q.id} className="question-item">
            <p className="mb-1 fw-semibold">{q.text}</p>
            {q.type === "RATING" ? (
              <p className="mb-0 text-body-secondary small">Rating from 1 (very poor) to 5 (excellent)</p>
            ) : (
              <>
                <p className="mb-1 text-body-secondary small">Single choice</p>
                <ul className="mb-0">
                  {q.options.map((o) => (
                    <li key={o.id}>{o.label}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ol>

      {confirming && (
        <ConfirmDialog
          title="Publish this survey?"
          message="Once published, respondents can answer and the questions can no longer be changed."
          confirmLabel="Publish"
          busy={publishing}
          onConfirm={publish}
          onCancel={closeDialog}
        />
      )}
    </section>
  );
}
