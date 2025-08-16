-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reusable function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Episodes table
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time_slots TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_episodes_user_id ON public.episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_episodes_date ON public.episodes(date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_episodes_updated_at ON public.episodes;
CREATE TRIGGER trg_episodes_updated_at
BEFORE UPDATE ON public.episodes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS and secure with owner-based policies
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Episodes are selectable by owner" ON public.episodes;
CREATE POLICY "Episodes are selectable by owner"
ON public.episodes
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Episodes can be inserted by owner" ON public.episodes;
CREATE POLICY "Episodes can be inserted by owner"
ON public.episodes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Episodes can be updated by owner" ON public.episodes;
CREATE POLICY "Episodes can be updated by owner"
ON public.episodes
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Episodes can be deleted by owner" ON public.episodes;
CREATE POLICY "Episodes can be deleted by owner"
ON public.episodes
FOR DELETE
USING (auth.uid() = user_id);

-- Guests table to track invitees per episode (minimal design for guest counts)
CREATE TABLE IF NOT EXISTS public.episode_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episode_guests_episode_id ON public.episode_guests(episode_id);

DROP TRIGGER IF EXISTS trg_episode_guests_updated_at ON public.episode_guests;
CREATE TRIGGER trg_episode_guests_updated_at
BEFORE UPDATE ON public.episode_guests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.episode_guests ENABLE ROW LEVEL SECURITY;

-- Policies: episode owners can manage their guests
DROP POLICY IF EXISTS "Guests selectable by episode owner" ON public.episode_guests;
CREATE POLICY "Guests selectable by episode owner"
ON public.episode_guests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = episode_id AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guests insertable by episode owner" ON public.episode_guests;
CREATE POLICY "Guests insertable by episode owner"
ON public.episode_guests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = episode_id AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guests updatable by episode owner" ON public.episode_guests;
CREATE POLICY "Guests updatable by episode owner"
ON public.episode_guests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = episode_id AND e.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guests deletable by episode owner" ON public.episode_guests;
CREATE POLICY "Guests deletable by episode owner"
ON public.episode_guests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.episodes e
    WHERE e.id = episode_id AND e.user_id = auth.uid()
  )
);
