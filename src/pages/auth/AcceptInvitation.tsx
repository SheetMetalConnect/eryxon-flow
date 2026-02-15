import { useState, useEffect } from 'react';
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
import AnimatedBackground from '@/components/AnimatedBackground';

export default function AcceptInvitation() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getInvitationByToken, acceptInvitation } = useInvitations();
  const { signUp } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    setLoading(true);
    const data = await getInvitationByToken(token);

    if (data) {
      setInvitation(data);
    } else {
      setError('Invitation not found or has expired');
    }

    setLoading(false);
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invitation || !token) {
      setError('Invalid invitation');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Sign up the user with invitation metadata
      const { error: signUpError, data: signUpData } = await signUp(
        invitation.email,
        password,
        {
          full_name: invitation.email.split('@')[0], // Temporary, user can update later
          role: invitation.role,
          tenant_id: invitation.tenant_id,
        }
      );

      if (signUpError) {
        throw signUpError;
      }

      // Accept the invitation
      if (signUpData?.user) {
        await acceptInvitation(token, signUpData.user.id);
      }

      toast.success(t('invitation.welcomeToTeam'));

      // Redirect to auth page
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
      console.error('Error accepting invitation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <AnimatedBackground />
        <div className="relative min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (error && !invitation) {
    return (
      <>
        <AnimatedBackground />
        <div className="relative min-h-screen flex items-start justify-center p-8 pt-20">
          <div className="onboarding-card">
            <div className="inline-flex items-center justify-center mb-4">
              <Factory className="w-12 h-12 text-destructive" strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>

            <Button onClick={() => navigate('/auth')} className="w-full cta-button">
              Go to Login
              <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AnimatedBackground />

      <div className="relative min-h-screen flex items-start justify-center p-8 pt-20">
        {/* Main Invitation Card */}
        <div className="onboarding-card">
          {/* Icon/Logo */}
          <div className="inline-flex items-center justify-center mb-4">
            <Factory className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>

          {/* Welcome Text */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
            You're Invited
          </p>

          {/* Hero Title */}
          <h1 className="hero-title">
            Join Your Team
          </h1>

          {/* Tagline */}
          <p className="text-base text-foreground/80 mb-6">
            Welcome to Eryxon Flow
          </p>

          {/* Divider */}
          <hr className="title-divider" />

          {invitation && (
            <div className="space-y-6">
              {/* Invitation Details */}
              <div className="bg-muted/30 backdrop-blur-sm p-5 rounded-xl space-y-4 border border-border-subtle text-left">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Invited by</p>
                    <p className="text-sm text-muted-foreground truncate">{invitation.invited_by_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Organization</p>
                    <p className="text-sm text-muted-foreground truncate">{invitation.tenant_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Email</p>
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
                    <p className="text-sm font-medium text-foreground">Role</p>
                    <p className="text-sm text-muted-foreground capitalize">{invitation.role}</p>
                  </div>
                </div>
              </div>

              {/* Signup Form */}
              <form onSubmit={handleAccept} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Create Password *
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
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password *
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
                    Accept Invitation & Join
                    <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground pt-4">
                  By accepting, you agree to create an account and join {invitation.tenant_name}
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
