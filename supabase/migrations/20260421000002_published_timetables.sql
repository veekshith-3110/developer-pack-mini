-- Allow anyone (including students) to read published timetables
CREATE POLICY IF NOT EXISTS "Anyone can read published timetables"
  ON public.timetable_saves FOR SELECT
  USING (is_published = true);
