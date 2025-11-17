// Extended Profile type with onboarding fields
// These fields exist in the database but aren't yet in the generated types
import { Tables } from '@/integrations/supabase/types';

export interface ProfileExtended extends Tables<'profiles'> {
  onboarding_completed?: boolean;
  onboarding_step?: number;
  tour_completed?: boolean;
  mock_data_imported?: boolean;
}
