DROP POLICY IF EXISTS "Users manage own timetable saves" ON public.timetable_saves;
CREATE POLICY timetable_saves_policy ON public.timetable_saves
  FOR ALL
  USING (auth.uid() = user_id OR is_published = true)
  WITH CHECK (auth.uid() = user_id);
