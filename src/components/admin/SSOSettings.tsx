import { useState } from 'react';
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
import { Loader2, Shield, Crown, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

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
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>{t('sso.title')}</CardTitle>
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
                <SelectTrigger id="sso_provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microsoft">Microsoft (Azure AD / Entra ID)</SelectItem>
                  <SelectItem value="google">Google Workspace</SelectItem>
                  <SelectItem value="saml" disabled>SAML (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Domain */}
            <div className="space-y-2">
              <Label htmlFor="sso_domain">{t('sso.domain')}</Label>
              <Input
                id="sso_domain"
                value={formData.sso_domain}
                onChange={(e) => setFormData({ ...formData, sso_domain: e.target.value.toLowerCase() })}
                placeholder={t('sso.domainPlaceholder')}
              />
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
