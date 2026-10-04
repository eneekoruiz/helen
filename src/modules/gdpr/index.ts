import { recordFileResult } from '../results.js';
import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'gdpr',
  name: 'GDPR Compliance',
  category: 'Legal',
  summary: 'Cookie consent banner + Privacy/Cookie/Terms policies',
  description: 'Adds a React cookie consent banner, a consent context provider, and template legal policies (Privacy, Cookies, Terms of Service).',
  problemItSolves: 'Compliance with GDPR/RGPD is legally required for most sites but often forgotten or implemented poorly.',
  whenToUse: 'On any site collecting cookies or personal data.',
  whenNotToUse: 'Purely internal tools with no tracking or data collection.',
  filesCreated: [
    'src/components/CookieBanner.tsx',
    'src/context/CookieContext.tsx',
    'src/pages/legal/PrivacyPolicy.tsx',
    'src/pages/legal/CookiePolicy.tsx',
    'src/pages/legal/Terms.tsx'
  ],
  filesModified: ['src/App.tsx'],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: ['React 18+'],
  risks: ['Legal templates are placeholders and must be reviewed by a lawyer.'],
  nextSteps: [
    'Review and customize legal policies',
    'Wrap your app with <CookieProvider>',
    'Add <CookieBanner /> to your main layout'
  ],
  riskLevel: 'medium',
  recommendedLevel: 'beginner',
  status: 'experimental',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  const banner = `import { useState, useEffect } from 'react';
import { useCookieConsent } from '../context/CookieContext';

export function CookieBanner() {
  const { consent, acceptAll, denyAll } = useCookieConsent();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (consent === 'undecided') {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [consent]);

  if (!show || consent !== 'undecided') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      background: 'var(--bg, #fff)',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      border: '1px solid #eee',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    }}>
      <div>
        <h3 style={{ margin: '0 0 5px 0' }}>Cookie Consent</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          We use cookies to enhance your experience. By clicking "Accept All", you consent to our use of cookies.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={acceptAll} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#000', color: '#fff', cursor: 'pointer' }}>
          Accept All
        </button>
        <button onClick={denyAll} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #eee', background: 'transparent', cursor: 'pointer' }}>
          Deny All
        </button>
      </div>
    </div>
  );
}
`;

  const context = `import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
    try {
      const saved = localStorage.getItem('cookie-consent');
      if (saved === 'accepted' || saved === 'denied') setConsent(saved);
    } catch {
      // Consent stays undecided when storage is unavailable.
    }
  }, []);

  const acceptAll = () => {
    setConsent('accepted');
    try { localStorage.setItem('cookie-consent', 'accepted'); } catch { /* Keep consent in memory. */ }
  };

  const denyAll = () => {
    setConsent('denied');
    try { localStorage.setItem('cookie-consent', 'denied'); } catch { /* Keep consent in memory. */ }
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
`;

  const files: Array<[string, string]> = [
    ['src/components/CookieBanner.tsx', banner],
    ['src/context/CookieContext.tsx', context],
    ...(['PrivacyPolicy', 'CookiePolicy', 'Terms'] as const).map((name): [string, string] => [
      `src/pages/legal/${name}.tsx`,
      `/** Replace this placeholder with your reviewed policy before publishing. */
export function ${name}() {
  return <main><h1>${name === 'Terms' ? 'Terms of Service' : name === 'PrivacyPolicy' ? 'Privacy Policy' : 'Cookie Policy'}</h1><p>Policy pending review. Add your organization, contact details, data processing purposes, retention periods and applicable rights here.</p></main>;
}
`,
    ]),
  ];
  for (const [file, content] of files) {
    const status = writeFileSafe(path.join(cwd, file), content, { dryRun, force, root: cwd });
    recordFileResult(result, file, status);
  }
  result.nextSteps.push(...meta.nextSteps);

  return result;
}

export const gdprModule: HelenModule = { meta, execute };
