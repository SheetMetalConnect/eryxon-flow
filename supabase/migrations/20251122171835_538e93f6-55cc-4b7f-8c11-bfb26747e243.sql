-- Fix search_path for update_issues_search_vector function
CREATE OR REPLACE FUNCTION public.update_issues_search_vector()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.severity::text, '')
  );
  RETURN NEW;
END;
$$;