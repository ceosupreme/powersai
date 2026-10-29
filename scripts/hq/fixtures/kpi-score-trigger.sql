-- Existing live KPI-to-pillar trigger captured read-only during the audit.
-- Fixture only; this file does not replace the deployed trigger.
CREATE OR REPLACE FUNCTION public.recompute_project_pillar_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_item numeric;
  v_num numeric := 0;
  v_den numeric := 0;
  v_sum numeric := 0;
  v_cnt integer := 0;
  v_score numeric;
BEGIN
  FOR r IN
    SELECT k.weight, k.direction, k.target, v.actual
    FROM public.project_kpis k
    LEFT JOIN public.project_kpi_values v
      ON v.project_id = k.project_id
     AND v.pillar_key = k.pillar_key
     AND v.kpi_key = k.kpi_key
     AND v.week_start = NEW.week_start
    WHERE k.project_id = NEW.project_id
      AND k.pillar_key = NEW.pillar_key
      AND k.is_active
  LOOP
    IF r.actual IS NULL OR r.target IS NULL THEN
      CONTINUE;
    END IF;

    IF r.direction = 'checklist' THEN
      v_item := least(greatest(r.actual, 0), 100);
    ELSIF r.direction = 'lower' THEN
      IF r.actual = 0 THEN
        v_item := 100;
      ELSIF r.target = 0 THEN
        v_item := 0;
      ELSE
        v_item := greatest(0, least(r.target / r.actual, 1) * 100);
      END IF;
    ELSE
      IF r.target = 0 THEN
        v_item := 0;
      ELSE
        v_item := greatest(0, least(r.actual / r.target, 1) * 100);
      END IF;
    END IF;

    v_cnt := v_cnt + 1;
    v_sum := v_sum + v_item;
    v_num := v_num + v_item * coalesce(r.weight, 0);
    v_den := v_den + coalesce(r.weight, 0);
  END LOOP;

  IF v_cnt = 0 THEN
    RETURN NEW;
  END IF;

  IF v_den > 0 THEN
    v_score := v_num / v_den;
  ELSE
    v_score := v_sum / v_cnt;
  END IF;

  INSERT INTO public.project_pillar_scores (project_id, week_start, pillar_key, score)
  VALUES (NEW.project_id, NEW.week_start, NEW.pillar_key, round(v_score, 2))
  ON CONFLICT (project_id, week_start, pillar_key)
  DO UPDATE SET score = EXCLUDED.score, updated_at = now();

  RETURN NEW;
END;
$function$
;
CREATE TRIGGER project_kpi_values_recompute_pillar AFTER INSERT OR UPDATE ON public.project_kpi_values FOR EACH ROW EXECUTE FUNCTION public.recompute_project_pillar_score();
