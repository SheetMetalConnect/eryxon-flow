import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Building2, UserCheck, Factory, ArrowRight } from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AuthCardHeader, AuthShell } from '@/components/auth/AuthShell';
import { logger } from '@/lib/logger';

export default function AcceptInvitation() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getInvitationByToken, acceptInvitation } = useInvitations();
  const { signUp } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<{
    email: string;
    role: string;
    tenant_id: string;
    tenant_name: string;
    invited_by_name: string;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadInvitation = useCallback(async () => {
    if (!token) {
      setError(t('invitation.invalidLink'));
      setLoading(false);
      return;
    }

    setLoading(true);
    const data = await getInvitationByToken(token);

    if (data) {
      setInvitation(data);
    } else {
      setError(t('invitation.notFoundOrExpired'));
    }

    setLoading(false);
  }, [getInvitationByToken, t, token]);

  useEffect(() => {
    void loadInvitation();
  }, [loadInvitation]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invitation || !token) {
      setError(t('invitation.invalid'));
      return;
    }

    if (password.length < 12) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t('auth.passwordComplexity'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('invitation.passwordsDoNotMatch'));
      return;
    }

    setSubmitting(true);

    try {
      const { error: signUpError, data: signUpData } = await signUp(
        invitation.email,
        password,
        {
          full_name: invitation.email.split('@')[0], // Temporary, user can update later
          role: invitation.role as 'admin' | 'operator',
          tenant_id: invitation.tenant_id,
        }
      );

      if (signUpError) {
        throw signUpError;
      }

      const userData = signUpData as { user?: { id: string } } | undefined;
      if (userData?.user) {
        await acceptInvitation(token, userData.user.id);
      }

      toast.success(t('invitation.welcomeToTeam'));

      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('invitation.acceptFailed'));
      logger.error('AcceptInvitation', 'Error accepting invitation', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthShell
        topRight={<LanguageSwitcher />}
        containerClassName="items-center"
        cardClassName="max-w-sm py-10"
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <Factory className="h-12 w-12 text-primary" strokeWidth={1.5} />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthShell>
    );
  }

  if (error && !invitation) {
    return (
      <AuthShell topRight={<LanguageSwitcher />} cardClassName="max-w-[440px]">
        <AuthCardHeader
          icon={Factory}
          appName={t('auth.appName')}
          eyebrow={t('invitation.youreInvited')}
          title={t('invitation.invalidTitle')}
          description={error}
          descriptionClassName="mt-2 text-center text-sm text-muted-foreground"
          iconClassName="h-12 w-12"
        />

        <Button onClick={() => navigate('/auth')} className="w-full cta-button">
          {t('invitation.goToLogin')}
          <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell topRight={<LanguageSwitcher />} cardClassName="max-w-[540px]">
      <AuthCardHeader
        icon={Factory}
        appName={t('auth.appName')}
        eyebrow={t('invitation.youreInvited')}
        title={t('invitation.joinYourTeam')}
        description={t('invitation.welcomeToEryxon')}
        descriptionClassName="mb-6 text-center text-base text-foreground/80"
        iconClassName="h-12 w-12"
      />

      {invitation && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl border border-border/80 p-5 text-left shadow-sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t('invitation.invitedBy')}</p>
                    <p className="text-sm text-muted-foreground truncate">{invitation.invited_by_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t('invitation.organization')}</p>
                    <p className="text-sm text-muted-foreground truncate">{invitation.tenant_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t('invitation.email')}</p>
                    <p className="text-sm text-muted-foreground truncate">{invitation.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {invitation.role === 'admin' ? 'A' : 'O'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{t('invitation.role')}</p>
                    <p className="text-sm text-muted-foreground capitalize">{invitation.role}</p>
                  </div>
                </div>
              </div>

          </div>

          <form onSubmit={handleAccept} className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('invitation.createPassword')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="bg-input-background border-input"
              />
              <p className="text-xs text-muted-foreground">{t('auth.passwordRequirements')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                {t('invitation.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="bg-input-background border-input"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full cta-button" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('invitation.acceptAndJoin')}
                <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
              </Button>
            </div>

            <p className="pt-4 text-center text-xs text-muted-foreground">
              {t('invitation.acceptTerms', { tenantName: invitation.tenant_name })}
            </p>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
