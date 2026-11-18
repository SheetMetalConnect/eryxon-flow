import type { Tables } from '@/integrations/supabase/types';

export type ExceptionStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
type JoinedExpectation = Pick<Tables<'expectations'>,
  'id' | 'entity_type' | 'entity_id' | 'expectation_type' | 'belief_statement' |
  'expected_value' | 'expected_at' | 'version' | 'source' | 'context'>;

export type ExceptionWithExpectation = Tables<'exceptions'> & {
  expectation: JoinedExpectation;
  acknowledger?: Pick<Tables<'profiles'>, 'id' | 'full_name'>;
  resolver?: Pick<Tables<'profiles'>, 'id' | 'full_name'>;
};
