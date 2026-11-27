-- Lab 7: widen the rating scale from 1-5 to 1-10.
ALTER TABLE "Answer" DROP CONSTRAINT "Answer_ratingValue_range";
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_ratingValue_range" CHECK ("ratingValue" IS NULL OR "ratingValue" BETWEEN 1 AND 10);
