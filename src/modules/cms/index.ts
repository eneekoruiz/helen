import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import { isModuleInstalled } from '../../core/config.js';
import path from 'node:path';
import fs from 'fs-extra';

const meta: HelenModule['meta'] = {
  id: 'cms',
  name: 'Visual CMS',
  category: 'CMS',
  summary: 'Visual WYSIWYG inline CMS with /admin routing and i18n adaptability',
  description: 'Scaffolds an inline content management system directly inside the frontend. Clients can edit text and media directly on the page. Autodetects existing i18n configurations.',
  problemItSolves: 'Headless CMS setups are complex and require external accounts. Long forms disconnect clients from their design. This allows true visual inline editing with zero learning curve.',
  whenToUse: 'On user-facing React projects where clients need simple text/image editing capability.',
  whenNotToUse: 'On purely programmatic backends or complex database projects requiring relational headless management.',
  filesCreated: [
    'src/cms/content.json',
    'src/context/CMSContext.tsx',
    'src/components/CMS/EditableText.tsx',
    'src/components/CMS/EditableImage.tsx',
    'src/components/CMS/EditableLink.tsx',
    'src/components/CMS/CMSToolbar.tsx'
  ],
  filesModified: [],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: ['React 18+'],
  risks: ['Persistence is currently localStorage-based. Changes should be serialized or exported to content.json for code commit.'],
  nextSteps: [
    'Wrap your main layout/App with <CMSProvider>',
    'Place <CMSToolbar /> inside your main layout',
    'Navigate to /admin in your browser to activate the editing interface'
  ],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
  status: 'experimental',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  // Audit if i18n is configured in the target project
  const hasI18n = isModuleInstalled(cwd, 'i18n') || 
                  fs.existsSync(path.join(cwd, 'src/i18n/config.ts')) ||
                  fs.existsSync(path.join(cwd, 'src/i18n/config.js'));

  // 1. Initial content JSON
  let contentJson = '';
  if (hasI18n) {
    contentJson = JSON.stringify({
      translatable: {
        en: {
          welcome: "Welcome to HELEN",
          description: "Fast, secure, production-ready setup",
          ctaText: "Learn More"
        },
        es: {
          welcome: "Bienvenido a HELEN",
          description: "Setup rápido, seguro y listo para producción",
          ctaText: "Más Información"
        }
      },
      universal: {
        phone: "+34 600 000 000",
        email: "contact@example.com",
        heroImage: "https://images.unsplash.com/photo-1551434678-e076c223a692",
        ctaUrl: "https://github.com/eneekoruiz/helen"
      }
    }, null, 2);
  } else {
    contentJson = JSON.stringify({
      welcome: "Welcome to HELEN",
      description: "Fast, secure, production-ready setup",
      phone: "+34 600 000 000",
      email: "contact@example.com",
      heroImage: "https://images.unsplash.com/photo-1551434678-e076c223a692",
      ctaText: "Learn More",
      ctaUrl: "https://github.com/eneekoruiz/helen"
    }, null, 2);
  }

  // 2. CMS Context React Provider
  let contextCode = '';
  if (hasI18n) {
    contextCode = `import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import defaultContent from '../cms/content.json';

interface CMSContextType {
  isAdmin: boolean;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
  content: typeof defaultContent;
  updateContent: (key: string, value: any, isUniversal?: boolean) => void;
  resetContent: () => void;
  logout: () => void;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);
const STORAGE_KEY = 'helen-cms-content';

export function CMSProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLanguage, setCurrentLanguageState] = useState(i18n.language || 'en');
  const [content, setContent] = useState<typeof defaultContent>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultContent;
  });

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setIsAdmin(true);
      setIsEditing(true);
      window.history.replaceState({}, document.title, '/');
      alert('✨ HELEN CMS: Modo Edición activado. Autenticado como Administrador.');
    }
  }, []);

  const setCurrentLanguage = (lang: string) => {
    setCurrentLanguageState(lang);
    i18n.changeLanguage(lang);
  };

  const updateContent = (key: string, value: any, isUniversal = false) => {
    setContent((prev) => {
      const next = { ...prev };
      if (isUniversal) {
        next.universal = { ...next.universal, [key]: value };
      } else {
        const lang = currentLanguage || i18n.language || 'en';
        const langContent = next.translatable[lang] || {};
        next.translatable = {
          ...next.translatable,
          [lang]: { ...langContent, [key]: value }
        };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetContent = () => {
    if (confirm('¿Seguro que deseas restablecer el contenido original? Se perderán todos los cambios.')) {
      localStorage.removeItem(STORAGE_KEY);
      setContent(defaultContent);
      window.location.reload();
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setIsEditing(false);
    alert('Sesión de edición finalizada.');
  };

  return (
    <CMSContext.Provider value={{
      isAdmin,
      isEditing,
      setIsEditing,
      currentLanguage,
      setCurrentLanguage,
      content,
      updateContent,
      resetContent,
      logout
    }}>
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const ctx = useContext(CMSContext);
  if (!ctx) throw new Error('useCMS must be used within a CMSProvider');
  return ctx;
}
`;
  } else {
    contextCode = `import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import defaultContent from '../cms/content.json';

interface CMSContextType {
  isAdmin: boolean;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  content: typeof defaultContent;
  updateContent: (key: string, value: any) => void;
  resetContent: () => void;
  logout: () => void;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);
const STORAGE_KEY = 'helen-cms-content';

export function CMSProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<typeof defaultContent>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultContent;
  });

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setIsAdmin(true);
      setIsEditing(true);
      window.history.replaceState({}, document.title, '/');
      alert('✨ HELEN CMS: Modo Edición activado. Autenticado como Administrador.');
    }
  }, []);

  const updateContent = (key: string, value: any) => {
    setContent((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetContent = () => {
    if (confirm('¿Seguro que deseas restablecer el contenido original? Se perderán todos los cambios.')) {
      localStorage.removeItem(STORAGE_KEY);
      setContent(defaultContent);
      window.location.reload();
    }
  };

  const logout = () => {
    setIsAdmin(false);
    setIsEditing(false);
    alert('Sesión de edición finalizada.');
  };

  return (
    <CMSContext.Provider value={{
      isAdmin,
      isEditing,
      setIsEditing,
      content,
      updateContent,
      resetContent,
      logout
    }}>
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const ctx = useContext(CMSContext);
  if (!ctx) throw new Error('useCMS must be used within a CMSProvider');
  return ctx;
}
`;
  }

  // 3. Inline editable components
  const textCode = `import { useCMS } from '../../context/CMSContext';

interface EditableTextProps {
  contentKey: string;
  isUniversal?: boolean;
  style?: React.CSSProperties;
  className?: string;
  tagName?: keyof React.ReactHTML;
}

export function EditableText({
  contentKey,
  isUniversal = false,
  style,
  className,
  tagName = 'span'
}: EditableTextProps) {
  const { isEditing, content, updateContent, currentLanguage } = useCMS() as any;

  let value = '';
  if (content.translatable || content.universal) {
    if (isUniversal) {
      value = content.universal?.[contentKey] || '';
    } else {
      value = content.translatable?.[currentLanguage || 'en']?.[contentKey] || '';
    }
  } else {
    value = content[contentKey] || '';
  }

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    const text = e.target.textContent || '';
    updateContent(contentKey, text, isUniversal);
  };

  const Tag = tagName as any;

  if (!isEditing) {
    return <Tag style={style} className={className}>{value}</Tag>;
  }

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={className}
      style={{
        ...style,
        outline: '1px dashed #3b82f6',
        outlineOffset: '2px',
        cursor: 'text',
        minWidth: '20px',
        display: style?.display || 'inline-block'
      }}
      title="Haga clic para editar"
    >
      {value}
    </Tag>
  );
}
`;

  const imgCode = `import { useCMS } from '../../context/CMSContext';

interface EditableImageProps {
  contentKey: string;
  isUniversal?: boolean;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}

export function EditableImage({
  contentKey,
  isUniversal = true,
  style,
  className,
  alt
}: EditableImageProps) {
  const { isEditing, content, updateContent, currentLanguage } = useCMS() as any;

  let src = '';
  if (content.universal || content.translatable) {
    if (isUniversal) {
      src = content.universal?.[contentKey] || '';
    } else {
      src = content.translatable?.[currentLanguage || 'en']?.[contentKey] || '';
    }
  } else {
    src = content[contentKey] || '';
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const newUrl = prompt('Ingrese la nueva URL de la imagen:', src);
    if (newUrl !== null) {
      updateContent(contentKey, newUrl, isUniversal);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={className}
      style={{
        position: 'relative',
        display: style?.display || 'inline-block',
        cursor: isEditing ? 'pointer' : 'default',
        width: style?.width,
        height: style?.height
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          ...style,
          display: 'block',
          width: '100%',
          height: '100%',
          border: isEditing ? '2px dashed #3b82f6' : style?.border
        }}
      />
      {isEditing && (
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'rgba(59, 130, 246, 0.9)',
          color: '#fff',
          padding: '4px 8px',
          fontSize: '0.75rem',
          borderRadius: '4px',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          📷 Cambiar
        </div>
      )}
    </div>
  );
}
`;

  const linkCode = `import { useCMS } from '../../context/CMSContext';

interface EditableLinkProps {
  textKey: string;
  urlKey: string;
  isUniversal?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function EditableLink({
  textKey,
  urlKey,
  isUniversal = false,
  style,
  className
}: EditableLinkProps) {
  const { isEditing, content, updateContent, currentLanguage } = useCMS() as any;

  let text = '';
  let href = '';

  if (content.translatable || content.universal) {
    if (isUniversal) {
      text = content.universal?.[textKey] || '';
      href = content.universal?.[urlKey] || '';
    } else {
      text = content.translatable?.[currentLanguage || 'en']?.[textKey] || '';
      href = content.translatable?.[currentLanguage || 'en']?.[urlKey] || '';
    }
  } else {
    text = content[textKey] || '';
    href = content[urlKey] || '';
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    
    const newText = prompt('Editar texto del enlace:', text);
    if (newText !== null && newText.trim() !== '') {
      updateContent(textKey, newText, isUniversal);
      
      const newUrl = prompt('Editar URL de destino:', href);
      if (newUrl !== null) {
        updateContent(urlKey, newUrl, isUniversal);
      }
    }
  };

  return (
    <a
      href={isEditing ? '#' : href}
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        borderBottom: isEditing ? '1px dashed #3b82f6' : style?.borderBottom,
        cursor: isEditing ? 'pointer' : style?.cursor
      }}
      title={isEditing ? 'Haga clic para editar enlace' : undefined}
    >
      {text}
    </a>
  );
}
`;

  const toolbarCode = `import { useCMS } from '../../context/CMSContext';

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
`;

  // Write all CMS files into target folder
  writeFileSafe(path.join(cwd, 'src/cms/content.json'), contentJson, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/context/CMSContext.tsx'), contextCode, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/components/CMS/EditableText.tsx'), textCode, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/components/CMS/EditableImage.tsx'), imgCode, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/components/CMS/EditableLink.tsx'), linkCode, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/components/CMS/CMSToolbar.tsx'), toolbarCode, { dryRun, force });

  result.created.push(
    'src/cms/content.json',
    'src/context/CMSContext.tsx',
    'src/components/CMS/EditableText.tsx',
    'src/components/CMS/EditableImage.tsx',
    'src/components/CMS/EditableLink.tsx',
    'src/components/CMS/CMSToolbar.tsx'
  );

  return result;
}

export const cmsModule: HelenModule = { meta, execute };
