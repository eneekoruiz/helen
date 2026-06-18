import { useCMS } from '../../context/CMSContext';

export function CMSToolbar() {
  const { isEditing, resetContent, logout, currentLanguage, setCurrentLanguage } = useCMS() as any;

  if (!isEditing) return null;

  const isI18n = typeof currentLanguage !== 'undefined';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(8px)',
      color: '#f8fafc',
      padding: '10px 20px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          letterSpacing: '0.05em'
        }}>
          HELEN CMS
        </span>
        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
          ✨ Visual Editor
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {isI18n && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="cms-lang-select" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Idioma:</label>
            <select
              id="cms-lang-select"
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        )}

        <button
          onClick={resetContent}
          style={{
            background: 'transparent',
            border: '1px solid rgba(248, 113, 113, 0.4)',
            color: '#f87171',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Resetear
        </button>

        <button
          onClick={logout}
          style={{
            background: '#ef4444',
            border: 'none',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444';
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}
