-- 20260922000000_add_ghn_sync_event_bus.sql
-- Game Hub Nepal: Realtime Synchronization Event Bus
-- Safe metadata-only event emission for real-time synchronization between User App and Admin Panel

CREATE TABLE IF NOT EXISTS public.ghn_sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    target_user_id VARCHAR(128),
    target_role VARCHAR(32),
    safe_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for real-time query filtering
CREATE INDEX IF NOT EXISTS idx_ghn_sync_events_type_created 
ON public.ghn_sync_events(entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ghn_sync_events_target_user 
ON public.ghn_sync_events(target_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ghn_sync_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read events relevant to them or public broadcast events
DROP POLICY IF EXISTS "Allow authenticated to select sync events" ON public.ghn_sync_events;
CREATE POLICY "Allow authenticated to select sync events" 
ON public.ghn_sync_events 
FOR SELECT 
TO authenticated 
USING (
    target_user_id IS NULL 
    OR target_user_id = auth.uid()::text 
    OR target_role = 'ADMIN'
);

-- Allow server/service role to insert events
DROP POLICY IF EXISTS "Allow service role to manage sync events" ON public.ghn_sync_events;
CREATE POLICY "Allow service role to manage sync events" 
ON public.ghn_sync_events 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Add to Realtime Publication if publication exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'ghn_sync_events'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.ghn_sync_events;
        END IF;
    END IF;
END $$;
