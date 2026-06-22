-- Recreate all cron jobs with hardcoded credentials (current_setting approach requires superuser)
-- Drop existing jobs first, then recreate with literal URL + service_role_key

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'push-morning-shift-reminder',
  'push-afternoon-shift-reminder',
  'push-evening-shift-reminder',
  'push-admin-daily-summary',
  'push-form-reminder-morning',
  'push-form-reminder-afternoon',
  'push-form-reminder-evening',
  'push-manager-morning-alert',
  'push-manager-afternoon-alert',
  'push-manager-evening-alert',
  'push-cleaning-notifications'
);

-- Morning shift reminder: 05:45 UTC = 08:45 IST (15 min before 09:00)
SELECT cron.schedule(
  'push-morning-shift-reminder',
  '45 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Afternoon shift reminder: 10:45 UTC = 13:45 IST (15 min before 14:00)
SELECT cron.schedule(
  'push-afternoon-shift-reminder',
  '45 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Evening shift reminder: 18:45 UTC = 21:45 IST (15 min before 22:00)
SELECT cron.schedule(
  'push-evening-shift-reminder',
  '45 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Admin daily summary: 05:00 UTC = 08:00 IST
SELECT cron.schedule(
  'push-admin-daily-summary',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Missing form reminder - morning: 04:00 UTC = 07:00 IST
SELECT cron.schedule(
  'push-form-reminder-morning',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Missing form reminder - afternoon: 12:00 UTC = 15:00 IST
SELECT cron.schedule(
  'push-form-reminder-afternoon',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Missing form reminder - evening: 20:00 UTC = 23:00 IST
SELECT cron.schedule(
  'push-form-reminder-evening',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Manager alert - morning missing forms: 04:01 UTC = 07:01 IST
SELECT cron.schedule(
  'push-manager-morning-alert',
  '1 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Manager alert - afternoon missing forms: 12:01 UTC = 15:01 IST
SELECT cron.schedule(
  'push-manager-afternoon-alert',
  '1 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Manager alert - evening missing forms: 20:01 UTC = 23:01 IST
SELECT cron.schedule(
  'push-manager-evening-alert',
  '1 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cleaning parade notifications: 05:05 UTC = 08:05 IST (Mon, Wed, Sat)
SELECT cron.schedule(
  'push-cleaning-notifications',
  '5 5 * * 1,3,6',
  $$
  SELECT net.http_post(
    url := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-cleaning-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTI4NjMyOCwiZXhwIjoyMDgwODYyMzI4fQ.r3v9xg5lY6B0Wih57AMY_ECBNSS2kerLZkMy63g57HI'
    ),
    body := '{}'::jsonb
  );
  $$
);
