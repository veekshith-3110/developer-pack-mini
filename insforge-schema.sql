-- Enums
CREATE TYPE app_role AS ENUM ('teacher', 'student');

-- Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  topic TEXT,
  subject TEXT,
  difficulty TEXT NOT NULL,
  question_count INTEGER DEFAULT 0 NOT NULL,
  correct_count INTEGER DEFAULT 0 NOT NULL,
  score_pct NUMERIC DEFAULT 0 NOT NULL,
  time_taken_seconds INTEGER,
  mode TEXT NOT NULL,
  label TEXT NOT NULL,
  grade TEXT DEFAULT 'Not Graded' NOT NULL,
  detected_topics TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS resume_screenings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS resume_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id UUID REFERENCES resume_screenings(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  match_score NUMERIC DEFAULT 0 NOT NULL,
  extracted_skills TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  missing_skills TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  summary TEXT,
  rank INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS timetable_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  college_name TEXT NOT NULL,
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  classes JSONB DEFAULT '[]'::jsonb NOT NULL,
  teachers JSONB DEFAULT '[]'::jsonb NOT NULL,
  time_slots JSONB DEFAULT '[]'::jsonb NOT NULL,
  assignments JSONB DEFAULT '[]'::jsonb NOT NULL,
  timetable JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS Enablement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Base Policies (can be tweaked as needed)
CREATE POLICY "Users can manage their own profiles" ON profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quiz attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own resume screenings" ON resume_screenings
  FOR ALL USING (auth.uid() = user_id);

-- Candidates belong to screenings, which belong to users
CREATE POLICY "Users can manage their own resume candidates" ON resume_candidates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM resume_screenings
      WHERE resume_screenings.id = resume_candidates.screening_id
      AND resume_screenings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own timetables" ON timetable_state
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own roles" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Passkey credentials (WebAuthn)
CREATE TABLE IF NOT EXISTS passkey_credentials (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id   TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,
  device_hint     TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own passkeys" ON passkey_credentials
  FOR ALL USING (auth.uid() = user_id);

-- Named timetable saves (history snapshots)
CREATE TABLE IF NOT EXISTS timetable_saves (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  snapshot    JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE timetable_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timetable saves" ON timetable_saves
  FOR ALL USING (auth.uid() = user_id);
