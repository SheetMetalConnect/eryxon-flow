-- Fix search_path security warning for get_cell_qrm_metrics
ALTER FUNCTION public.get_cell_qrm_metrics(UUID, UUID) SET search_path = public;