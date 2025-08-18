-- Add selected_time_slot column to episode_guests table
ALTER TABLE public.episode_guests 
ADD COLUMN selected_time_slot TEXT;

-- Enable realtime for episodes and episode_guests tables
ALTER TABLE public.episodes REPLICA IDENTITY FULL;
ALTER TABLE public.episode_guests REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.episodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.episode_guests;