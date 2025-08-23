-- Add rejection note column to episode_guests table
ALTER TABLE public.episode_guests 
ADD COLUMN rejection_note TEXT;