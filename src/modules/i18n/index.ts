import type { HelenModule } from '../types.js';
import type { HelenContext, ModuleResult } from '../../core/context.js';
import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson } from '../../core/fs.js';
import path from 'node:path';

const meta: HelenModule['meta'] = {
  id: 'i18n',
  name: 'Internationalization',
  category: 'i18n',
  summary: 'react-i18next setup + translation structure',
  description: 'Sets up i18next for multi-language support, including language detection, folder structure for JSON translations, and a sample language switcher hook.',
  problemItSolves: 'Adding multi-language support later in a project is painful. Doing it from day one ensures all strings are translatable.',
  whenToUse: 'Any project that needs to support more than one language.',
  whenNotToUse: 'One-off landing pages or internal tools for a single-language team.',
  filesCreated: [
    'src/i18n/config.ts',
    'src/i18n/locales/en.json',
    'src/i18n/locales/es.json'
  ],
  filesModified: ['src/main.tsx', 'package.json'],
  runtimeDependencies: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
  devDependencies: [],
  requirements: ['React 18+'],
  risks: [],
  nextSteps: [
    'Import src/i18n/config.ts in your main.tsx',
    'Start using the useTranslation hook in your components'
  ],
  riskLevel: 'low',
  recommendedLevel: 'beginner',
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;

  const i18nConfig = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
`;

  const enJson = JSON.stringify({
    common: {
      welcome: "Welcome to HELEN",
      description: "Fast, secure, production-ready setup"
    }
  }, null, 2);

  const esJson = JSON.stringify({
    common: {
      welcome: "Bienvenido a HELEN",
      description: "Setup rápido, seguro y listo para producción"
    }
  }, null, 2);

  writeFileSafe(path.join(cwd, 'src/i18n/config.ts'), i18nConfig, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/i18n/locales/en.json'), enJson, { dryRun, force });
  writeFileSafe(path.join(cwd, 'src/i18n/locales/es.json'), esJson, { dryRun, force });
  
  result.created.push('src/i18n/config.ts', 'src/i18n/locales/en.json', 'src/i18n/locales/es.json');

  patchPackageJson(cwd, {
    dependencies: {
      'i18next': '^23.0.0',
      'react-i18next': '^13.0.0',
      'i18next-browser-languagedetector': '^7.0.0'
    }
  }, { dryRun });
  result.modified.push('package.json');

  return result;
}

export const i18nModule: HelenModule = { meta, execute };
