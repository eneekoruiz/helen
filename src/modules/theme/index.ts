import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'theme',
  name: 'Theme System',
  category: 'UI',
  summary: 'ThemeProvider + useTheme hook + ThemeToggle component',
  description: 'Creates a complete dark/light/system theme system with React context, a custom hook, and a toggle component.',
  problemItSolves: 'Dark mode is expected in modern apps. This provides a clean, reusable implementation.',
  whenToUse: 'On any user-facing application that should support dark mode.',
  whenNotToUse: 'Backend-only projects or if you use a UI library with built-in theming.',
  filesCreated: ['src/components/ThemeProvider.tsx', 'src/hooks/useTheme.ts', 'src/components/ThemeToggle.tsx'],
  filesModified: [],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: ['React 18+'],
  risks: [],
  nextSteps: ['Wrap your app with <ThemeProvider>', 'Add ThemeToggle to your navbar'],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  // ThemeProvider
  const provider = `import { createContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'helen-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
  });

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
  }, [resolved]);

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => setThemeState('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
`;
  const r1 = writeFileSafe(path.join(cwd, 'src/components/ThemeProvider.tsx'), provider, { dryRun, force });
  if (r1 === 'created' || r1 === 'overwritten') result.created.push('src/components/ThemeProvider.tsx');
  else result.skipped.push('src/components/ThemeProvider.tsx');

  // useTheme hook
  const hook = `import { useContext } from 'react';
import { ThemeContext } from '../components/ThemeProvider';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
`;
  const r2 = writeFileSafe(path.join(cwd, 'src/hooks/useTheme.ts'), hook, { dryRun, force });
  if (r2 === 'created' || r2 === 'overwritten') result.created.push('src/hooks/useTheme.ts');
  else result.skipped.push('src/hooks/useTheme.ts');

  // ThemeToggle component
  const toggle = `import { useTheme } from '../hooks/useTheme';
import type { Theme } from './ThemeProvider';

const options: { value: Theme; label: string }[] = [
  { value: 'light', label: '☀️' },
  { value: 'dark', label: '🌙' },
  { value: 'system', label: '💻' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div role="radiogroup" aria-label="Theme selector" style={{ display: 'flex', gap: '4px' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          aria-pressed={theme === opt.value}
          title={\`\${opt.value} mode\`}
          style={{
            padding: '6px 10px',
            border: theme === opt.value ? '2px solid currentColor' : '2px solid transparent',
            borderRadius: '6px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '1.2rem',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
`;
  const r3 = writeFileSafe(path.join(cwd, 'src/components/ThemeToggle.tsx'), toggle, { dryRun, force });
  if (r3 === 'created' || r3 === 'overwritten') result.created.push('src/components/ThemeToggle.tsx');
  else result.skipped.push('src/components/ThemeToggle.tsx');

  result.nextSteps.push('Wrap app with <ThemeProvider>');
  result.nextSteps.push('Add <ThemeToggle /> to your navbar');
  return result;
}

export const themeModule: HelenModule = { meta, execute };
