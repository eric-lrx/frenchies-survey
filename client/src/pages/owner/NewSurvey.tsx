import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, type QuestionType } from "../../api.js";
import FieldError from "../../components/FieldError.js";
import { toBody, validateDraft, type QuestionDraft, type SurveyDraft } from "./surveyForm.js";

// F-03 "New survey" (contract section 3): one step, with a message next to each invalid
// field, one request per click, and the entered values kept after a server error.
const MAX_QUESTIONS = 20;
const MAX_OPTIONS = 6;

let nextKey = 1;
const newQuestion = (): QuestionDraft => ({ key: nextKey++, text: "", type: "RATING", options: [] });

export default function NewSurvey() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<SurveyDraft>(() => ({ title: "", description: "", questions: [newQuestion()] }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  // A message describes the value that was checked; once that field changes, it goes.
  const clearError = (...keys: string[]) =>
    setErrors((current) => {
      if (!keys.some((k) => k in current)) return current;
      const next = { ...current };
      for (const k of keys) delete next[k];
      return next;
    });

  const updateQuestion = (index: number, change: Partial<QuestionDraft>) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q, i) => (i === index ? { ...q, ...change } : q)) }));

  function changeType(index: number, type: QuestionType) {
    const current = draft.questions[index];
    clearError(`questions[${index}].options`);
    updateQuestion(index, { type, options: type === "CHOICE" && current.options.length === 0 ? ["", ""] : current.options });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const body = toBody(draft);
    const fields = validateDraft(body);
    setErrors(fields);
    setFormError("");
    if (Object.keys(fields).length > 0) return;

    submitting.current = true;
    setBusy(true);
    try {
      const created = await api.createSurvey(body);
      navigate(`/owner/surveys/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setErrors(err.fields);
      setFormError(err instanceof ApiError ? err.message : "The survey could not be saved.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const describedBy = (key: string) => (errors[key] ? `${key}-error` : undefined);

  return (
    <section aria-labelledby="new-survey-title">
      <h1 id="new-survey-title" className="h4 mb-3">
        New survey
      </h1>
      <form onSubmit={handleSubmit} noValidate className="cf-panel">
        <div className="mb-3">
          <label htmlFor="survey-title" className="form-label">
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="survey-title"
            className="form-control"
            value={draft.title}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy("title")}
            onChange={(e) => {
              clearError("title");
              setDraft({ ...draft, title: e.target.value });
            }}
          />
          <FieldError id="title-error" message={errors.title} />
        </div>
        <div className="mb-4">
          <label htmlFor="survey-description" className="form-label">
            Description (optional)
          </label>
          <textarea
            id="survey-description"
            className="form-control"
            rows={2}
            value={draft.description}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy("description")}
            onChange={(e) => {
              clearError("description");
              setDraft({ ...draft, description: e.target.value });
            }}
          />
          <FieldError id="description-error" message={errors.description} />
        </div>

        <h2 className="h6">Questions</h2>
        <FieldError id="questions-error" message={errors.questions} />
        <ol className="question-list">
          {draft.questions.map((q, i) => {
            const n = i + 1;
            const key = `questions[${i}]`;
            return (
              <li key={q.key} className="question-item">
                <div className="row g-2">
                  <div className="col-md-8">
                    <label htmlFor={`q${q.key}-text`} className="form-label">
                      Question {n} text
                    </label>
                    <input
                      id={`q${q.key}-text`}
                      className="form-control"
                      value={q.text}
                      aria-invalid={Boolean(errors[`${key}.text`])}
                      aria-describedby={describedBy(`${key}.text`)}
                      onChange={(e) => {
                        clearError(`${key}.text`);
                        updateQuestion(i, { text: e.target.value });
                      }}
                    />
                    <FieldError id={`${key}.text-error`} message={errors[`${key}.text`]} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor={`q${q.key}-type`} className="form-label">
                      Question {n} type
                    </label>
                    <select id={`q${q.key}-type`} className="form-select" value={q.type} onChange={(e) => changeType(i, e.target.value as QuestionType)}>
                      <option value="RATING">Rating (1 to 5)</option>
                      <option value="CHOICE">Single choice</option>
                    </select>
                  </div>
                </div>

                {q.type === "CHOICE" && (
                  <fieldset className="mt-2" aria-describedby={describedBy(`${key}.options`)}>
                    <legend className="form-label fs-6">Options for question {n}</legend>
                    {q.options.map((option, j) => (
                      <div key={j} className="d-flex gap-2 mb-2">
                        <label htmlFor={`q${q.key}-o${j}`} className="visually-hidden">
                          Question {n}, option {j + 1}
                        </label>
                        <input
                          id={`q${q.key}-o${j}`}
                          className="form-control"
                          placeholder={`Option ${j + 1}`}
                          value={option}
                          onChange={(e) => {
                            clearError(`${key}.options`);
                            updateQuestion(i, { options: q.options.map((o, k) => (k === j ? e.target.value : o)) });
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          aria-label={`Remove option ${j + 1} of question ${n}`}
                          onClick={() => updateQuestion(i, { options: q.options.filter((_, k) => k !== j) })}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <FieldError id={`${key}.options-error`} message={errors[`${key}.options`]} />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={q.options.length >= MAX_OPTIONS}
                      onClick={() => updateQuestion(i, { options: [...q.options, ""] })}
                    >
                      Add option
                    </button>
                  </fieldset>
                )}

                {draft.questions.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-danger px-0 mt-2"
                    onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, k) => k !== i) })}
                  >
                    Remove question {n}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          className="btn btn-outline-secondary mb-4"
          disabled={draft.questions.length >= MAX_QUESTIONS}
          onClick={() => setDraft({ ...draft, questions: [...draft.questions, newQuestion()] })}
        >
          Add question
        </button>

        {formError && (
          <p role="alert" className="text-danger">
            {formError}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-cafe" disabled={busy}>
            {busy ? "Saving…" : "Save draft"}
          </button>
        </div>
      </form>
    </section>
  );
}
