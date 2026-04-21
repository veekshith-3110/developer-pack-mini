-- Add PE and OE config columns to timetable_state
ALTER TABLE public.timetable_state
  ADD COLUMN IF NOT EXISTS pe_config JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS oe_config JSONB DEFAULT NULL;

-- Add PE and OE config to timetable_saves snapshot (no schema change needed — snapshot is JSONB)
