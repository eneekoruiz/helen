/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

// Declaración para el tipado global de Serwist
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope | any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
      method: 'GET',
    },
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
      method: 'POST',
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Push Notification Event Listener
self.addEventListener('push', (event: any) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Bio-Avatar';
      const options = {
        body: data.body || 'Tu Bio-Avatar necesita atención.',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          url: data.url || '/',
        },
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error('Error parsing push data', err);
      // Fallback text if not JSON
      const textData = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Bio-Avatar', {
          body: textData,
          icon: '/icon-192x192.png',
        })
      );
    }
  }
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients: any[]) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
