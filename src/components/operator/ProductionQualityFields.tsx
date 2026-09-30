import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export interface ScrapEntry {
  reasonId: string;
  quantity: number;
}

interface Props {
  scrap: ScrapEntry[];
  onScrapChange: (value: ScrapEntry[]) => void;
  rework: number;
  onReworkChange: (value: number) => void;
  disabled: boolean;
}

export function ProductionQualityFields({ scrap, onScrapChange, rework, onReworkChange, disabled }: Props) {
  const { t } = useTranslation();
  const profile = useProfile();
  const [reasons, setReasons] = useState<Array<{ id: string; code: string; description: string }>>([]);

  useEffect(() => {
    let active = true;
    if (!profile?.tenant_id) return;
    void supabase.from('scrap_reasons').select('id, code, description')
      .eq('tenant_id', profile.tenant_id).eq('active', true).order('code')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) toast.error(t('notifications.failed'));
        else setReasons(data ?? []);
      });
    return () => { active = false; };
  }, [profile?.tenant_id, t]);

  const updateScrap = (index: number, value: Partial<ScrapEntry>) => {
    onScrapChange(scrap.map((entry, i) => i === index ? { ...entry, ...value } : entry));
  };

  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="text-sm font-medium">{t('production.addScrapRework')}</legend>
    <Label htmlFor="quantity-rework">{t('production.rework')}</Label>
    <Input id="quantity-rework" type="number" min={0} step={1} value={rework}
      onChange={event => onReworkChange(Number(event.target.value))} />
    {scrap.map((entry, index) => <div key={index} className="space-y-1">
      <Label htmlFor={`quantity-scrap-${index}`}>{t('production.scrap')} {index + 1}</Label>
      <Input id={`quantity-scrap-${index}`} type="number" min={0} step={1} value={entry.quantity}
        onChange={event => updateScrap(index, { quantity: Number(event.target.value) })} />
      <select aria-label={`${t('production.selectReason')} ${index + 1}`} value={entry.reasonId}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        onChange={event => updateScrap(index, { reasonId: event.target.value })}>
        <option value="">{t('production.selectReason')}</option>
        {reasons.filter(reason => reason.id === entry.reasonId || !scrap.some(other => other.reasonId === reason.id))
          .map(reason => <option key={reason.id} value={reason.id}>{reason.code}: {reason.description}</option>)}
      </select>
    </div>)}
    <Button type="button" variant="outline" onClick={() => onScrapChange([...scrap, { reasonId: '', quantity: 0 }])}>
      {t('production.addReason')}
    </Button>
    <p className="text-sm">{t('production.totalScrap')}: {scrap.reduce((sum, entry) => sum + entry.quantity, 0)}</p>
  </fieldset>;
}
