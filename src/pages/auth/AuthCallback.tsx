import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (Supabase OAuth flow)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('OAuth callback error:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          setStatus('success');

          // Small delay to show success state
          setTimeout(() => {
            // Check if user has completed onboarding
            const checkOnboarding = async () => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('onboarding_completed, role')
                .eq('id', data.session!.user.id)
                .single();

              if (profile?.onboarding_completed === false) {
                navigate('/onboarding', { replace: true });
              } else if (profile?.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
              } else {
                navigate('/operator/work-queue', { replace: true });
              }
            };

            checkOnboarding();
          }, 1000);
        } else {
          // No session - might still be processing
          // Wait a bit and check again
          setTimeout(async () => {
            const { data: retryData } = await supabase.auth.getSession();
            if (retryData.session) {
              setStatus('success');
              navigate('/', { replace: true });
            } else {
              setStatus('error');
              setErrorMessage('No session found after OAuth callback');
            }
          }, 2000);
        }
      } catch (err) {
        console.error('OAuth callback exception:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during sign in');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <>
      <AnimatedBackground />

      <div className="landing-container">
        <div className="onboarding-card max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            {status === 'processing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">{t('sso.callback.processing')}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-lg font-medium text-green-500">{t('sso.callback.success')}</p>
                <p className="text-sm text-muted-foreground">{t('sso.callback.redirecting')}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-lg font-medium text-red-500">{t('sso.callback.error')}</p>
                {errorMessage && (
                  <p className="text-sm text-muted-foreground text-center">{errorMessage}</p>
                )}
                <button
                  onClick={() => navigate('/auth', { replace: true })}
                  className="text-primary hover:underline text-sm mt-4"
                >
                  {t('auth.signIn')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
