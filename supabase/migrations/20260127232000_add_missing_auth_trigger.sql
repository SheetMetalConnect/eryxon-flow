-- Add missing trigger for user signup
-- This trigger was lost during the schema reset

-- Recreate the trigger (DROP IF EXISTS to be idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
