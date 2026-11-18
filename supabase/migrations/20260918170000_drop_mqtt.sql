-- The MQTT publisher never opened an MQTT connection; webhooks are the event path.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-mqtt-logs') THEN
    PERFORM cron.unschedule('cleanup-mqtt-logs');
  END IF;
END $$;
DROP TABLE IF EXISTS public.mqtt_logs, public.mqtt_publishers CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_mqtt_logs();
DROP FUNCTION IF EXISTS public.update_mqtt_publisher_updated_at();
