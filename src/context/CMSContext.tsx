import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Simple default content structure for reference typechecking
const defaultContent = {
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
};

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLanguage, setCurrentLanguageState] = useState('en');
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
  };

  const updateContent = (key: string, value: any, isUniversal = false) => {
    setContent((prev) => {
      const next = { ...prev };
      if (isUniversal) {
        next.universal = { ...next.universal, [key]: value };
      } else {
        const lang = currentLanguage || 'en';
        const langContent = (next.translatable as any)[lang] || {};
        (next.translatable as any)[lang] = { ...langContent, [key]: value };
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
