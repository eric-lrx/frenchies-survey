import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, formatDateTime, type SurveyResponses as SurveyResponsesData } from "../../api.js";
import { Loading, LoadError } from "../../components/Feedback.js";

export default function SurveyResponses() {
  const { id } = useParams();
  const [data, setData] = useState<SurveyResponsesData | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    setError("");
    setNotFound(false);
    setData(null);
    api
      .getSurveyResponses(Number(id))
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "Responses could not be loaded.");
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
  if (!data) return <Loading label="Loading responses..." />;

  return (
    <section>
      <p className="mb-2">
        <Link to={`/owner/surveys/${data.surveyId}`}>{"<-"} Back to survey</Link>
      </p>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="h4 mb-0">Responses: {data.title}</h1>
        <a
          href={`/api/surveys/${data.surveyId}/responses?format=csv`}
          className="btn btn-outline-secondary btn-sm ms-auto"
          download
        >
          Export CSV
        </a>
      </div>

      {data.responses.length === 0 ? (
        <p className="text-body-secondary">No responses yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th>Respondent</th>
                <th>Submitted</th>
                {data.questions.map((q) => (
                  <th key={q.id}>{q.text}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.responses.map((r) => {
                const answerMap = new Map(
                  r.answers.map((a) => ["ratingValue" in a ? [a.questionId, String(a.ratingValue)] : [a.questionId, a.optionLabel ?? ""]]).map(([k, v]) => [k, v]),
                );
                return (
                  <tr key={r.id}>
                    <td>{r.respondentName}</td>
                    <td className="text-nowrap">{formatDateTime(r.submittedAt)}</td>
                    {data.questions.map((q) => {
                      const a = r.answers.find((a) => a.questionId === q.id);
                      return (
                        <td key={q.id}>
                          {a && "ratingValue" in a ? a.ratingValue : a && "optionLabel" in a ? a.optionLabel : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-body-secondary small">{data.responses.length} response{data.responses.length !== 1 ? "s" : ""}</p>
    </section>
  );
}
