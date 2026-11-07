// F-07 aggregate summary (contract section 1, BR-11). A pure function over aggregate rows,
// so the calculation rules are unit-tested directly (UNIT-03). It receives counts only and
// returns numbers only: no respondent and no individual response (AC-F07-03).

export interface SummaryQuestion {
  id: number;
  position: number;
  text: string;
  type: "RATING" | "CHOICE";
  options: { id: number; position: number; label: string }[];
}

export interface SummaryInput {
  questions: SummaryQuestion[];
  responseCount: number;
  ratingCounts: { questionId: number; value: number; count: number }[];
  optionCounts: { optionId: number; count: number }[];
}

export type QuestionSummary =
  | { questionId: number; position: number; text: string; type: "RATING"; average: number | null; distribution: Record<"1" | "2" | "3" | "4" | "5", number> }
  | { questionId: number; position: number; text: string; type: "CHOICE"; options: { optionId: number; label: string; count: number }[] };

// round(10 × sum ÷ count) ÷ 10, half up, from integers; null when there is no answer.
export function averageOf(sum: number, count: number): number | null {
  return count === 0 ? null : Math.round((10 * sum) / count) / 10;
}

export function computeSummary({ questions, ratingCounts, optionCounts }: SummaryInput): QuestionSummary[] {
  const optionCount = new Map(optionCounts.map((o) => [o.optionId, o.count]));

  return [...questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => {
      if (q.type === "RATING") {
        const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        let sum = 0;
        let count = 0;
        for (const row of ratingCounts) {
          if (row.questionId !== q.id) continue;
          distribution[String(row.value) as keyof typeof distribution] += row.count;
          sum += row.value * row.count;
          count += row.count;
        }
        return { questionId: q.id, position: q.position, text: q.text, type: "RATING", average: averageOf(sum, count), distribution };
      }
      return {
        questionId: q.id,
        position: q.position,
        text: q.text,
        type: "CHOICE",
        options: [...q.options]
          .sort((a, b) => a.position - b.position)
          .map((o) => ({ optionId: o.id, label: o.label, count: optionCount.get(o.id) ?? 0 })),
      };
    });
}
