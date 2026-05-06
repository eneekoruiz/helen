import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';
const meta = {
    id: 'seo',
    name: 'SEO Basics',
    category: 'SEO',
    summary: 'SEO component + robots.txt + web manifest',
    description: 'Creates a reusable SEO React component, robots.txt, and a basic web manifest for discoverability.',
    problemItSolves: 'SPAs have poor SEO by default. This provides the foundational elements search engines need.',
    whenToUse: 'On any public-facing web application.',
    whenNotToUse: 'Internal tools or admin panels not indexed by search engines.',
    filesCreated: ['src/components/SEO.tsx', 'public/robots.txt', 'public/manifest.json'],
    filesModified: [],
    runtimeDependencies: ['react-helmet-async'],
    devDependencies: [],
    requirements: ['React project'],
    risks: [],
    nextSteps: ['Customize robots.txt for your domain', 'Add og-image.png to public/'],
    riskLevel: 'low',
    recommendedLevel: 'beginner',
    status: 'stable',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force } = ctx;
    // SEO Component
    const seoComponent = `import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export function SEO({ title, description, canonical, ogImage, noIndex }: SEOProps) {
  const siteName = 'My App';

  return (
    <Helmet>
      <title>{\`\${title} | \${siteName}\`}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
`;
    const r1 = writeFileSafe(path.join(cwd, 'src/components/SEO.tsx'), seoComponent, { dryRun, force });
    if (r1 === 'created' || r1 === 'overwritten')
        result.created.push('src/components/SEO.tsx');
    else
        result.skipped.push('src/components/SEO.tsx');
    // robots.txt
    const robots = `User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n`;
    const r2 = writeFileSafe(path.join(cwd, 'public/robots.txt'), robots, { dryRun, force });
    if (r2 === 'created' || r2 === 'overwritten')
        result.created.push('public/robots.txt');
    else
        result.skipped.push('public/robots.txt');
    // manifest.json
    const manifest = JSON.stringify({
        name: 'My App',
        short_name: 'App',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
    }, null, 2);
    const r3 = writeFileSafe(path.join(cwd, 'public/manifest.json'), manifest, { dryRun, force });
    if (r3 === 'created' || r3 === 'overwritten')
        result.created.push('public/manifest.json');
    else
        result.skipped.push('public/manifest.json');
    result.nextSteps.push('Replace example.com in robots.txt');
    result.nextSteps.push('Add icon files to public/icons/');
    return result;
}
export const seoModule = { meta, execute };
//# sourceMappingURL=index.js.map