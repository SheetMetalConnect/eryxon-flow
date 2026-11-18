import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (value: string) => void;
}

export function ScanDialog({ open, onOpenChange, onResult }: ScanDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{t('mobile.scanTitle')}</DialogTitle>
        <DialogDescription>{t('workQueue.scanInputHint')}</DialogDescription>
      </DialogHeader>
      <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onResult(value.trim());
        setValue('');
        onOpenChange(false);
      }}>
        <Input autoFocus aria-label={t('mobile.codePlaceholder')} autoComplete="off"
          autoCorrect="off" spellCheck={false} value={value}
          onChange={(event) => setValue(event.target.value)} placeholder={t('mobile.codePlaceholder')} />
        <Button type="submit" disabled={!value.trim()}>{t('common.submit')}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
