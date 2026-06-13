
-- Fix function search_path warnings
CREATE OR REPLACE FUNCTION get_grade(score DECIMAL)
RETURNS grade_letter AS $$
BEGIN
  IF score >= 90 THEN RETURN 'A';
  ELSIF score >= 80 THEN RETURN 'B';
  ELSIF score >= 70 THEN RETURN 'C';
  ELSIF score >= 60 THEN RETURN 'D';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION validate_scorecard_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.overall_score IS NOT NULL THEN
    NEW.overall_grade := get_grade(NEW.overall_score::DECIMAL)::TEXT;
    NEW.qa_grade_mismatch := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Move pg_trgm to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
