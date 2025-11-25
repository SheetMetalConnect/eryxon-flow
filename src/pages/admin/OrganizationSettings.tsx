import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2, Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const { profile, tenant, refreshTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    timezone: 'UTC',
    billing_email: '',
    factory_opening_time: '07:00',
    factory_closing_time: '17:00',
    auto_stop_tracking: false,
  });

  useEffect(() => {
    loadTenantDetails();
  }, [tenant]);

  const loadTenantDetails = async () => {
    if (!tenant) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant.id)
        .single();

      if (error) throw error;

      // Format time from database format (HH:MM:SS) to input format (HH:MM)
      const formatTime = (time: string | null) => {
        if (!time) return '';
        return time.substring(0, 5);
      };

      setFormData({
        name: data.name || '',
        company_name: data.company_name || '',
        timezone: data.timezone || 'UTC',
        billing_email: data.billing_email || '',
        factory_opening_time: formatTime(data.factory_opening_time) || '07:00',
        factory_closing_time: formatTime(data.factory_closing_time) || '17:00',
        auto_stop_tracking: data.auto_stop_tracking || false,
      });
    } catch (error: any) {
      console.error('Error loading tenant details:', error);
      toast.error('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenant) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          company_name: formData.company_name,
          timezone: formData.timezone,
          billing_email: formData.billing_email,
          factory_opening_time: formData.factory_opening_time + ':00',
          factory_closing_time: formData.factory_closing_time + ':00',
          auto_stop_tracking: formData.auto_stop_tracking,
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success(t('organizationSettings.settingsUpdated'));
      await refreshTenant();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast.error(error.message || 'Failed to update organization settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
          Organization Settings
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your organization profile and preferences
        </p>
      </div>

      <hr className="title-divider" />

      <form onSubmit={handleSave}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>
              Update your organization details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="My Organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Manufacturing"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for scheduling and due dates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_email">{t('organizationSettings.billingEmail')}</Label>
              <Input
                id="billing_email"
                type="email"
                value={formData.billing_email}
                onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                placeholder="billing@example.com"
              />
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={saving} className="cta-button gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {t('organizationSettings.saveChanges')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Factory Hours Card */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>{t('organizationSettings.factoryHours.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('organizationSettings.factoryHours.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="factory_opening_time">{t('organizationSettings.factoryHours.openingTime')}</Label>
                <Input
                  id="factory_opening_time"
                  type="time"
                  value={formData.factory_opening_time}
                  onChange={(e) => setFormData({ ...formData, factory_opening_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="factory_closing_time">{t('organizationSettings.factoryHours.closingTime')}</Label>
                <Input
                  id="factory_closing_time"
                  type="time"
                  value={formData.factory_closing_time}
                  onChange={(e) => setFormData({ ...formData, factory_closing_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto_stop_tracking" className="text-base">
                  {t('organizationSettings.factoryHours.autoStopTracking')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('organizationSettings.factoryHours.autoStopDescription')}
                </p>
              </div>
              <Switch
                id="auto_stop_tracking"
                checked={formData.auto_stop_tracking}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_stop_tracking: checked })}
              />
            </div>

            {formData.auto_stop_tracking && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
                <p className="text-sm text-warning">
                  {t('organizationSettings.factoryHours.autoStopWarning', {
                    time: formData.factory_closing_time,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* Subscription Info (Read-only for now) */}
      {tenant && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan and usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Plan</span>
              <span className="text-sm capitalize">{tenant.plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status</span>
              <span className="text-sm capitalize">{tenant.status}</span>
            </div>
            {tenant.plan === 'free' && (
              <p className="text-xs text-muted-foreground pt-2">
                Contact us to upgrade to Pro or Premium plans
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
