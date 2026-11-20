import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Language, Persona } from './supabase';
import { translations, type TranslationKey } from './i18n';

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  persona: Persona;
  setPersona: (p: Persona) => void;
  t: (key: TranslationKey) => string;
}

const AppContext = createContext<AppContextValue>({
  language: 'en',
  setLanguage: () => {},
  persona: 'citizen',
  setPersona: () => {},
  t: (key) => key,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [persona, setPersona] = useState<Persona>('citizen');

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, persona, setPersona, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
