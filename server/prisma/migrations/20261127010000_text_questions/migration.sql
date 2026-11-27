-- F-12: add TEXT question type and textValue answer column.
ALTER TYPE "QuestionType" ADD VALUE 'TEXT';

ALTER TABLE "Answer" ADD COLUMN "textValue" TEXT;

-- Update the exactly-one-value constraint to include textValue.
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_exactly_one_value";
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_exactly_one_value" CHECK (num_nonnulls("ratingValue", "optionId", "textValue") = 1);
