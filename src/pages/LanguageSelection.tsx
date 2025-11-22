import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AnimatedBackground from '@/components/AnimatedBackground';

type Language = 'en' | 'nl' | 'de';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
}

const languages: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    description: 'International business language',
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    description: 'Voor Nederlandse gebruikers',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    description: 'Für deutsche Benutzer',
  },
];

export default function LanguageSelection() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { profile } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    (i18n.language as Language) || 'en'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLanguageSelect = async () => {
    if (!profile?.id) return;

    setIsSubmitting(true);
    try {
      // Update language preference in database
      const { error } = await supabase
        .from('profiles')
        .update({ language_preference: selectedLanguage })
        .eq('id', profile.id);

      if (error) throw error;

      // Update i18n language
      await i18n.changeLanguage(selectedLanguage);

      // Navigate to onboarding
      navigate('/onboarding');
    } catch (error) {
      console.error('Error saving language preference:', error);
      toast.error('Failed to save language preference');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatedBackground />

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 glass-card rounded-full">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h1 className="hero-title text-5xl mb-4">
              Choose Your Language
            </h1>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
              Select your preferred language to continue. You can change this later in settings.
            </p>
          </div>

          {/* Language Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {languages.map((lang) => (
              <Card
                key={lang.code}
                className={`glass-card cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedLanguage === lang.code
                    ? 'ring-2 ring-primary shadow-lg shadow-primary/20'
                    : 'hover:shadow-xl'
                }`}
                onClick={() => setSelectedLanguage(lang.code)}
              >
                <CardContent className="p-8 text-center relative">
                  {/* Checkmark for selected language */}
                  {selectedLanguage === lang.code && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-primary rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Flag */}
                  <div className="text-6xl mb-4">{lang.flag}</div>

                  {/* Language Name */}
                  <h3 className="text-2xl font-bold mb-2">{lang.nativeName}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{lang.name}</p>

                  {/* Description */}
                  <p className="text-xs text-foreground/60">{lang.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button
              onClick={handleLanguageSelect}
              disabled={isSubmitting}
              className="cta-button px-12 py-6 text-lg"
              size="lg"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>

            <p className="mt-6 text-sm text-muted-foreground">
              This helps us personalize your experience
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
