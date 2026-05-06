import { useState, useEffect } from 'react';
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
