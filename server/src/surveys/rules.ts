// F-03 survey validation (contract section 1, BR-12, FR-04, FR-05). A pure function, so the
// rules are unit-tested directly (UNIT-01) and the route only stores what it returns.

export type QuestionType = "RATING" | "CHOICE";

export interface SurveyInput {
  title: string;
  description: string | null;
  questions: { text: string; type: QuestionType; options: string[] }[];
}

export type Validation<T> = { ok: true; value: T } | { ok: false; fields: Record<string, string> };

const isString = (v: unknown): v is string => typeof v === "string";

export function validateSurveyInput(body: unknown): Validation<SurveyInput> {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fields: Record<string, string> = {};

  const title = isString(input.title) ? input.title.trim() : "";
  if (title.length < 3 || title.length > 120) fields.title = "Must be 3 to 120 characters";

  let description: string | null = null;
  if (input.description !== undefined && input.description !== null) {
    if (!isString(input.description) || input.description.trim().length > 500) {
      fields.description = "Must be 500 characters or fewer";
    } else {
      description = input.description.trim() || null;
    }
  }

  const questions: SurveyInput["questions"] = [];
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 20) {
    fields.questions = "Add 1 to 20 questions";
  } else {
    input.questions.forEach((raw, i) => {
      const q = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const key = `questions[${i}]`;

      const text = isString(q.text) ? q.text.trim() : "";
      if (text.length < 3 || text.length > 200) fields[`${key}.text`] = "Must be 3 to 200 characters";

      if (q.type !== "RATING" && q.type !== "CHOICE") {
        fields[`${key}.type`] = "Choose rating or choice";
        return;
      }

      const options: string[] = [];
      if (q.type === "RATING") {
        if (q.options !== undefined && !(Array.isArray(q.options) && q.options.length === 0)) {
          fields[`${key}.options`] = "A rating question has no options";
        }
      } else if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        fields[`${key}.options`] = "A choice question needs 2 to 6 options";
      } else {
        for (const option of q.options) {
          const label = isString(option) ? option.trim() : "";
          if (label.length < 1 || label.length > 60) {
            fields[`${key}.options`] = "Each option needs 1 to 60 characters";
            break;
          }
          options.push(label);
        }
        if (!fields[`${key}.options`] && new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
          fields[`${key}.options`] = "Options must be different";
        }
      }
      questions.push({ text, type: q.type, options });
    });
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, value: { title, description, questions } };
}
