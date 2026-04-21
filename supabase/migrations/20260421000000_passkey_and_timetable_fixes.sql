-- ── Passkey credentials table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.passkey_credentials (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT        NOT NULL UNIQUE,
  public_key    TEXT        NOT NULL DEFAULT '',
  device_hint   TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own passkeys"
  ON public.passkey_credentials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id
  ON public.passkey_credentials (user_id);

-- ── Named timetable saves (history snapshots) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.timetable_saves (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  snapshot   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timetable saves"
  ON public.timetable_saves FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_timetable_saves_user_id
  ON public.timetable_saves (user_id, created_at DESC);

-- ── Add lab_assignments column to timetable_state ─────────────────────────
ALTER TABLE public.timetable_state
  ADD COLUMN IF NOT EXISTS lab_assignments JSONB NOT NULL DEFAULT '[]';
