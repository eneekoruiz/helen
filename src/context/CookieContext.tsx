import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Consent = 'accepted' | 'denied' | 'undecided';

interface CookieContextValue {
  consent: Consent;
  acceptAll: () => void;
  denyAll: () => void;
}

const CookieContext = createContext<CookieContextValue | undefined>(undefined);

export function CookieProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent>('undecided');

  useEffect(() => {
    const saved = localStorage.getItem('cookie-consent') as Consent;
    if (saved) setConsent(saved);
  }, []);

  const acceptAll = () => {
    setConsent('accepted');
    localStorage.setItem('cookie-consent', 'accepted');
  };

  const denyAll = () => {
    setConsent('denied');
    localStorage.setItem('cookie-consent', 'denied');
  };

  return (
    <CookieContext.Provider value={{ consent, acceptAll, denyAll }}>
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieProvider');
  return ctx;
}
