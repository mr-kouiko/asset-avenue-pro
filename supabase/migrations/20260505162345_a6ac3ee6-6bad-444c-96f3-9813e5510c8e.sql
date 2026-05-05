
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if present
DO $$
BEGIN
  PERFORM cron.unschedule('retry-pending-scans-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'retry-pending-scans-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/retry-pending-scans',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ2Zwb3BocG9xdWd0dXZmeHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODQzMzEsImV4cCI6MjA3MDE2MDMzMX0.m8KZCGvdZm2v6jBiQnv6LQqM2DPhuaVlcVWrTc0dMp8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
