import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Building2, UserCheck } from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AcceptInvitation() {
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

      toast.success('Welcome to the team! Please check your email to verify your account.');

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-primary" />
            <CardTitle className="text-2xl font-bold">Join Your Team</CardTitle>
          </div>
          <CardDescription>
            You've been invited to join Eryxon MES
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation && (
            <div className="space-y-6">
              {/* Invitation Details */}
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Invited by</p>
                    <p className="text-sm text-muted-foreground">{invitation.invited_by_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Organization</p>
                    <p className="text-sm text-muted-foreground">{invitation.tenant_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{invitation.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-primary">
                      {invitation.role === 'admin' ? 'A' : 'O'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-sm text-muted-foreground capitalize">{invitation.role}</p>
                  </div>
                </div>
              </div>

              {/* Signup Form */}
              <form onSubmit={handleAccept} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accept Invitation & Join
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By accepting, you agree to create an account and join {invitation.tenant_name}
                </p>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
