-- Store credentials in Vault for cron job authentication
SELECT vault.create_secret('https://vatgianzotsurljznsry.supabase.co', 'project_url');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdGdpYW56b3RzdXJsanpuc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTA2MDksImV4cCI6MjA3ODI2NjYwOX0.7AjzaZjAMcygsMiPbI8w43F00JDU6hlpOWlbejOAZS0', 'anon_key');

-- Schedule monthly parts counter reset (runs at midnight on 1st of each month)
SELECT cron.schedule(
  'monthly-parts-counter-reset',
  '0 0 1 * *', -- At 00:00 on day 1 of every month
  $$
  SELECT
    net.http_post(
        url:= (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/monthly-reset-cron',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
        ),
        body:=jsonb_build_object('triggered_at', now())
    ) as request_id;
  $$
);