import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, type AnswerBody, type OpenSurveyDetail } from "../../api.js";
import { Loading, LoadError } from "../../components/Feedback.js";
import FieldError from "../../components/FieldError.js";

// F-06 answer form (contract section 3), on the survey page of F-05. Every question is a
// fieldset with its text as legend; all are required; one request per click; on 400 the
// answers stay selected; a 409 explains why and links back to the list.
const RATINGS = [1, 2, 3, 4, 5];

export default function SurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<OpenSurveyDetail | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [refusal, setRefusal] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

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

  function choose(questionId: number, value: number) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    setErrors((e) => {
      const key = `answers[${questionId}]`;
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!survey || submitting.current) return;
    const missing: Record<string, string> = {};
    for (const q of survey.questions) {
      if (answers[q.id] === undefined) missing[`answers[${q.id}]`] = "Please answer this question";
    }
    setErrors(missing);
    setFormError("");
    if (Object.keys(missing).length > 0) return;

    const body: AnswerBody[] = survey.questions.map((q) =>
      q.type === "RATING" ? { questionId: q.id, ratingValue: answers[q.id] } : { questionId: q.id, optionId: answers[q.id] },
    );
    submitting.current = true;
    setBusy(true);
    try {
      const response = await api.submitResponse(survey.id, body);
      navigate(`/responses/${response.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setRefusal(err.message);
      else if (err instanceof ApiError && err.status === 400) {
        setErrors(err.fields);
        setFormError(err.message);
      } else if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setFormError(err instanceof ApiError ? err.message : "Your response could not be sent.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const backLink = (
    <Link to="/surveys" className="btn btn-outline-secondary btn-sm">
      Back to open surveys
    </Link>
  );

  if (notFound) {
    return (
      <div className="cf-panel">
        <p>This survey is not available.</p>
        {backLink}
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

      {survey.alreadyResponded ? (
        <div className="cf-panel">
          <p>You have already answered this survey.</p>
          {backLink}
        </div>
      ) : refusal ? (
        <div className="cf-panel">
          <p role="alert" className="text-danger">
            {refusal}
          </p>
          {backLink}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="cf-panel">
          {survey.questions.map((q) => {
            const key = `answers[${q.id}]`;
            const errorId = `q${q.id}-error`;
            return (
              <fieldset key={q.id} className="answer-question" aria-describedby={errors[key] ? errorId : undefined}>
                <legend className="h6">{q.text}</legend>
                {q.type === "RATING" ? (
                  <>
                    <p className="small text-body-secondary mb-2">1 = very poor, 5 = excellent</p>
                    <div className="rating-row">
                      {RATINGS.map((n) => (
                        <label key={n} className="rating-choice">
                          <input type="radio" name={`q${q.id}`} value={n} checked={answers[q.id] === n} onChange={() => choose(q.id, n)} />
                          <span>{n}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  q.options.map((o) => (
                    <div key={o.id} className="form-check">
                      <input
                        id={`q${q.id}-o${o.id}`}
                        className="form-check-input"
                        type="radio"
                        name={`q${q.id}`}
                        value={o.id}
                        checked={answers[q.id] === o.id}
                        onChange={() => choose(q.id, o.id)}
                      />
                      <label htmlFor={`q${q.id}-o${o.id}`} className="form-check-label">
                        {o.label}
                      </label>
                    </div>
                  ))
                )}
                <FieldError id={errorId} message={errors[key]} />
              </fieldset>
            );
          })}
          {formError && (
            <p role="alert" className="text-danger">
              {formError}
            </p>
          )}
          <button type="submit" className="btn btn-cafe" disabled={busy}>
            {busy ? "Sending…" : "Submit"}
          </button>
        </form>
      )}
    </section>
  );
}
