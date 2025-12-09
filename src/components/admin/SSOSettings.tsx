import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCanUseSSO } from '@/hooks/useCanUseSSO';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Crown, Save, ExternalLink, CheckCircle2, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';

// Provider icons
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

interface SSOSettingsProps {
  onSave?: () => void;
}

export function SSOSettings({ onSave }: SSOSettingsProps) {
  const { t } = useTranslation();
  const { tenant, refreshTenant } = useAuth();
  const { canUseSSO, ssoEnabled, ssoProvider, ssoDomain, ssoEnforceOnly } = useCanUseSSO();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    sso_enabled: ssoEnabled,
    sso_provider: ssoProvider || 'microsoft',
    sso_domain: ssoDomain || '',
    sso_enforce_only: ssoEnforceOnly,
  });

  // Update form when tenant SSO config changes
  useEffect(() => {
    setFormData({
      sso_enabled: ssoEnabled,
      sso_provider: ssoProvider || 'microsoft',
      sso_domain: ssoDomain || '',
      sso_enforce_only: ssoEnforceOnly,
    });
  }, [ssoEnabled, ssoProvider, ssoDomain, ssoEnforceOnly]);

  const handleSave = async () => {
    if (!tenant || !canUseSSO) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          sso_enabled: formData.sso_enabled,
          sso_provider: formData.sso_provider,
          sso_domain: formData.sso_domain || null,
          sso_enforce_only: formData.sso_enforce_only,
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success(t('sso.settingsUpdated'));
      await refreshTenant();
      onSave?.();
    } catch (error: any) {
      console.error('Error saving SSO settings:', error);
      toast.error(error.message || 'Failed to save SSO settings');
    } finally {
      setSaving(false);
    }
  };

  // Show upgrade prompt if not on premium
  if (!canUseSSO) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>{t('sso.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-500">{t('sso.premiumFeature')}</span>
            </div>
          </div>
          <CardDescription>
            {t('sso.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('sso.premiumRequired')}
              </p>
              <p className="text-sm text-muted-foreground">
                Configure enterprise SSO with domain-based routing and enforce SSO-only authentication.
              </p>
            </div>
            <Button variant="outline" className="gap-2" asChild>
              <a href="/admin/my-plan">
                <Crown className="h-4 w-4" />
                {t('sso.viewPlans')}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>{t('sso.title')}</CardTitle>
          </div>
          {ssoEnabled && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('sso.ssoEnabled')}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t('sso.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable SSO Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="sso_enabled" className="text-base">
              {formData.sso_enabled ? t('sso.ssoEnabled') : t('sso.ssoDisabled')}
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable enterprise Single Sign-On for your organization
            </p>
          </div>
          <Switch
            id="sso_enabled"
            checked={formData.sso_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, sso_enabled: checked })}
          />
        </div>

        {formData.sso_enabled && (
          <div className="space-y-4 pt-2">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="sso_provider">{t('sso.provider')}</Label>
              <Select
                value={formData.sso_provider}
                onValueChange={(value) => setFormData({ ...formData, sso_provider: value })}
              >
                <SelectTrigger id="sso_provider" className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {formData.sso_provider === 'microsoft' && <MicrosoftIcon className="h-4 w-4" />}
                      {formData.sso_provider === 'google' && <GoogleIcon className="h-4 w-4" />}
                      {formData.sso_provider === 'microsoft' && 'Microsoft (Azure AD / Entra ID)'}
                      {formData.sso_provider === 'google' && 'Google Workspace'}
                      {formData.sso_provider === 'saml' && 'SAML'}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microsoft">
                    <div className="flex items-center gap-2">
                      <MicrosoftIcon className="h-4 w-4" />
                      Microsoft (Azure AD / Entra ID)
                    </div>
                  </SelectItem>
                  <SelectItem value="google">
                    <div className="flex items-center gap-2">
                      <GoogleIcon className="h-4 w-4" />
                      Google Workspace
                    </div>
                  </SelectItem>
                  <SelectItem value="saml" disabled>
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      SAML (Coming Soon)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Domain */}
            <div className="space-y-2">
              <Label htmlFor="sso_domain">{t('sso.domain')}</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sso_domain"
                  value={formData.sso_domain}
                  onChange={(e) => setFormData({ ...formData, sso_domain: e.target.value.toLowerCase() })}
                  placeholder={t('sso.domainPlaceholder')}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('sso.domainDescription')}
              </p>
            </div>

            {/* Enforce SSO Only */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="sso_enforce_only" className="text-base">
                  {t('sso.enforceOnly')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('sso.enforceOnlyDescription')}
                </p>
              </div>
              <Switch
                id="sso_enforce_only"
                checked={formData.sso_enforce_only}
                onCheckedChange={(checked) => setFormData({ ...formData, sso_enforce_only: checked })}
              />
            </div>

            {formData.sso_enforce_only && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-sm text-amber-500">
                  Warning: When enforced, users will not be able to sign in with email/password.
                  Make sure SSO is properly configured before enabling this option.
                </p>
              </div>
            )}

            {/* Provider-specific setup info */}
            {formData.sso_provider === 'microsoft' && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 space-y-2">
                <p className="text-sm font-medium text-blue-400">{t('sso.microsoftSetup')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sso.microsoftSetupDescription')}
                </p>
                <Button variant="link" size="sm" className="p-0 h-auto text-blue-400" asChild>
                  <a
                    href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Azure Portal <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="cta-button gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {t('organizationSettings.saveChanges')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SSOSettings;
