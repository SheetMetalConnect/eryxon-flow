import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    setOpen(false);
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-9 px-3 hover:bg-white/10 transition-base"
        >
          <span className="text-lg leading-none">{currentLanguage.flag}</span>
          <Globe className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 glass-card" align="end">
        <div className="px-4 py-3 border-b border-border-subtle bg-primary/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("languageSwitcher.selectLanguage")}
          </p>
        </div>
        <div className="p-1">
          {languages.map((language) => {
            const isSelected = i18n.language === language.code;
            return (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-base",
                  isSelected
                    ? "bg-primary/20 text-foreground"
                    : "hover:bg-white/5 text-foreground/90"
                )}
              >
                <span className="text-2xl leading-none">{language.flag}</span>
                <div className="flex-1">
                  <div className={cn("text-sm", isSelected && "font-semibold")}>
                    {language.nativeName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {language.name}
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
