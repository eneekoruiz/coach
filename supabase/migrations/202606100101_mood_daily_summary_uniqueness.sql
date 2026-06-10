-- One daily summary per user/date. Point-in-time mood logs remain unlimited.

DO $$
BEGIN
  IF to_regclass('public.mood_logs') IS NOT NULL THEN
    DELETE FROM public.mood_logs a
    USING public.mood_logs b
    WHERE a.user_id = b.user_id
      AND a.date = b.date
      AND COALESCE(a.is_daily_summary, false) = true
      AND COALESCE(b.is_daily_summary, false) = true
      AND a.created_at_timestamp < b.created_at_timestamp;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_mood_logs_one_daily_summary
      ON public.mood_logs(user_id, date)
      WHERE COALESCE(is_daily_summary, false) = true;
  END IF;
END $$;
