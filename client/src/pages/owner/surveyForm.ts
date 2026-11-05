import type { NewSurveyBody, QuestionType } from "../../api.js";

// Client copy of the F-03 validation rules, for early messages next to each field. The API
// applies the same rules again and is the authority (system SDS, section 1). Field keys and
// messages match the API, so a 400 from the server lands on the same fields.

export interface QuestionDraft {
  key: number;
  text: string;
  type: QuestionType;
  options: string[];
}

export interface SurveyDraft {
  title: string;
  description: string;
  questions: QuestionDraft[];
}

export function toBody(draft: SurveyDraft): NewSurveyBody {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    questions: draft.questions.map((q) =>
      q.type === "CHOICE"
        ? // Empty option rows are ignored, not sent.
          { text: q.text.trim(), type: q.type, options: q.options.map((o) => o.trim()).filter((o) => o !== "") }
        : { text: q.text.trim(), type: q.type },
    ),
  };
}

export function validateDraft(body: NewSurveyBody): Record<string, string> {
  const fields: Record<string, string> = {};
  if (body.title.length < 3 || body.title.length > 120) fields.title = "Must be 3 to 120 characters";
  if ((body.description ?? "").length > 500) fields.description = "Must be 500 characters or fewer";
  if (body.questions.length < 1 || body.questions.length > 20) fields.questions = "Add 1 to 20 questions";
  body.questions.forEach((q, i) => {
    const key = `questions[${i}]`;
    if (q.text.length < 3 || q.text.length > 200) fields[`${key}.text`] = "Must be 3 to 200 characters";
    if (q.type === "CHOICE") {
      const options = q.options ?? [];
      if (options.length < 2 || options.length > 6) fields[`${key}.options`] = "A choice question needs 2 to 6 options";
      else if (options.some((o) => o.length > 60)) fields[`${key}.options`] = "Each option needs 1 to 60 characters";
      else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) fields[`${key}.options`] = "Options must be different";
    }
  });
  return fields;
}
