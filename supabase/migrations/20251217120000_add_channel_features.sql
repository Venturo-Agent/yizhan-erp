-- Add channel features (idempotent)
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS channel_type TEXT DEFAULT 'PUBLIC';
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_channels_channel_type ON public.channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_is_announcement ON public.channels(is_announcement);
