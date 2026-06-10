-- Defense-in-depth guard: a routine can only link to a habit owned by the same user.

CREATE OR REPLACE FUNCTION public.routine_linked_habit_belongs_to_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.linked_habit_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_habits h
    WHERE h.id = NEW.linked_habit_id
      AND h.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'linked_habit_id must belong to the same user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS routine_templates_linked_habit_owner_guard ON public.routine_templates;

CREATE TRIGGER routine_templates_linked_habit_owner_guard
BEFORE INSERT OR UPDATE OF linked_habit_id, user_id
ON public.routine_templates
FOR EACH ROW
EXECUTE FUNCTION public.routine_linked_habit_belongs_to_user();
