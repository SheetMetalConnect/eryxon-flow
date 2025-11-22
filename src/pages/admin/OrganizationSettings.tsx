import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Save } from 'lucide-react';
import { toast } from 'sonner';

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
  const { profile, tenant, refreshTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    timezone: 'UTC',
    contact_email: '',
    billing_email: '',
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

      setFormData({
        name: data.name || '',
        company_name: data.company_name || '',
        timezone: data.timezone || 'UTC',
        contact_email: data.contact_email || '',
        billing_email: data.billing_email || '',
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
          contact_email: formData.contact_email,
          billing_email: formData.billing_email,
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success('Organization settings updated');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization profile and preferences
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_email">Billing Email</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={formData.billing_email}
                  onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })}
                  placeholder="billing@example.com"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Subscription Info (Read-only for now) */}
      {tenant && (
        <Card>
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
