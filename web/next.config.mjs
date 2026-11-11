import path from 'path';
import withSerwistInit from '@serwist/next';
import { withSentryConfig } from '@sentry/nextjs';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Opcional: desactivar el service worker en dev para evitar problemas de caché al programar
  disable: process.env.NODE_ENV === 'development',
});

const projectRoot = path.resolve(process.cwd());

const nextConfig = withSerwist({
  reactStrictMode: true,
  allowedDevOrigins: ['http://localhost:3000'],
  turbopack: {
    root: projectRoot,
  },
});

export default withSentryConfig(nextConfig, {
  silent: true,
});
