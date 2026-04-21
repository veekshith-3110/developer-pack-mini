
-- Resume screening sessions table
CREATE TABLE public.resume_screenings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  job_description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual candidate results
CREATE TABLE public.resume_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id UUID NOT NULL REFERENCES public.resume_screenings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  extracted_text TEXT NOT NULL DEFAULT '',
  extracted_skills TEXT[] NOT NULL DEFAULT '{}',
  missing_skills TEXT[] NOT NULL DEFAULT '{}',
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resume_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_candidates ENABLE ROW LEVEL SECURITY;

-- Policies for resume_screenings
CREATE POLICY "Users can select their own screenings"
  ON public.resume_screenings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own screenings"
  ON public.resume_screenings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own screenings"
  ON public.resume_screenings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenings"
  ON public.resume_screenings FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for resume_candidates (via screening ownership)
CREATE POLICY "Users can select candidates of their screenings"
  ON public.resume_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resume_screenings
      WHERE id = resume_candidates.screening_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert candidates for their screenings"
  ON public.resume_candidates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resume_screenings
      WHERE id = resume_candidates.screening_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete candidates of their screenings"
  ON public.resume_candidates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.resume_screenings
      WHERE id = resume_candidates.screening_id
        AND user_id = auth.uid()
    )
  );

-- Timestamps trigger
CREATE TRIGGER update_resume_screenings_updated_at
  BEFORE UPDATE ON public.resume_screenings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
