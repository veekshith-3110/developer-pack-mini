
-- Create table to persist full timetable state per user
CREATE TABLE public.timetable_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  teachers jsonb NOT NULL DEFAULT '[]',
  classes jsonb NOT NULL DEFAULT '[]',
  assignments jsonb NOT NULL DEFAULT '[]',
  time_slots jsonb NOT NULL DEFAULT '[]',
  timetable jsonb NOT NULL DEFAULT '[]',
  college_name text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  semester text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own timetable state"
  ON public.timetable_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timetable state"
  ON public.timetable_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timetable state"
  ON public.timetable_state FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_timetable_state_updated_at
  BEFORE UPDATE ON public.timetable_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
