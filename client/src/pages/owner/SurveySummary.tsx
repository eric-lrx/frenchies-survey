import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type QuestionSummary, type SurveySummary as Summary } from "../../api.js";
import StatusBadge from "../../components/StatusBadge.js";
import { Loading, LoadError } from "../../components/Feedback.js";

// F-07 summary screen (contract section 3). Every figure is written as text next to its bar,
// so nothing depends on colour or bar length alone (NFR-07).
const RATING_VALUES = ["1", "2", "3", "4", "5"] as const;

const percent = (count: number, total: number) => (total === 0 ? 0 : Math.round((count / total) * 100));

export default function SurveySummary() {
  const { id } = useParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setError("");
    setNotFound(false);
    setSummary(null);
    api
      .getSummary(Number(id))
      .then(setSummary)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "The results could not be loaded.");
      });
  }, [id]);

  useEffect(load, [load]);

  if (notFound) {
    return (
      <div className="cf-panel">
        <p>This survey does not exist or is not yours.</p>
        <Link to="/owner/surveys">Back to my surveys</Link>
      </div>
    );
  }
  if (error) return <LoadError message={error} onRetry={load} />;
  if (!summary) return <Loading label="Loading the results…" />;

  const total = summary.responseCount;
  return (
    <section aria-labelledby="summary-title">
      <p className="mb-2">
        <Link to={`/owner/surveys/${summary.surveyId}`}>← Back to the survey</Link>
      </p>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h1 id="summary-title" className="h4 mb-0">
          Results: {summary.title}
        </h1>
        <StatusBadge status={summary.status} />
      </div>
      <p className="summary-count">{total === 0 ? "No responses yet" : total === 1 ? "1 response" : `${total} responses`}</p>

      {summary.questions.map((q) => (
        <div key={q.questionId} className="cf-panel mb-3">
          {q.type === "RATING" ? <RatingResult q={q} /> : <ChoiceResult q={q} total={total} />}
        </div>
      ))}
    </section>
  );
}

function RatingResult({ q }: { q: Extract<QuestionSummary, { type: "RATING" }> }) {
  const max = Math.max(1, ...RATING_VALUES.map((v) => q.distribution[v]));
  return (
    <>
      <h2 id={`q${q.questionId}-title`} className="h6">
        {q.text}
      </h2>
      <p className="mb-2">
        Average: <strong>{q.average === null ? "—" : `${q.average.toFixed(1)} / 5`}</strong>
      </p>
      <table className="table table-sm summary-table mb-0" aria-labelledby={`q${q.questionId}-title`}>
        <thead>
          <tr>
            <th scope="col">Rating</th>
            <th scope="col">Responses</th>
          </tr>
        </thead>
        <tbody>
          {RATING_VALUES.map((v) => (
            <tr key={v}>
              <th scope="row">{v}</th>
              <td>
                <span className="summary-bar" aria-hidden="true" style={{ width: `${(q.distribution[v] / max) * 100}%` }} />
                <span>{q.distribution[v]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ChoiceResult({ q, total }: { q: Extract<QuestionSummary, { type: "CHOICE" }>; total: number }) {
  return (
    <>
      <h2 id={`q${q.questionId}-title`} className="h6">
        {q.text}
      </h2>
      <table className="table table-sm summary-table mb-0" aria-labelledby={`q${q.questionId}-title`}>
      <thead>
        <tr>
          <th scope="col">Option</th>
          <th scope="col">Responses</th>
          <th scope="col">Share</th>
        </tr>
      </thead>
      <tbody>
        {q.options.map((o) => (
          <tr key={o.optionId}>
            <th scope="row">{o.label}</th>
            <td>
              <span className="summary-bar" aria-hidden="true" style={{ width: `${percent(o.count, total)}%` }} />
              <span>{o.count}</span>
            </td>
            <td>{percent(o.count, total)}%</td>
          </tr>
        ))}
      </tbody>
      </table>
    </>
  );
}
