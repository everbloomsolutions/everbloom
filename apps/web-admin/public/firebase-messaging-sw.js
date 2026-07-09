importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
});

const messaging = firebase.messaging();

// Simple logger for service worker context
// Note: Service workers run in a separate context, so we use a minimal logger
const logger = {
  info: (message, ...args) => {
    // In development, log all messages; in production, only log errors
    // Service workers don't have access to import.meta.env, so we check for dev mode differently
    if (typeof self !== 'undefined' && self.registration && self.registration.scope.includes('localhost')) {
      console.log(`[SW-INFO] ${message}`, ...args);
    }
  },
  error: (message, ...args) => {
    // Always log errors, even in production
    console.error(`[SW-ERROR] ${message}`, ...args);
    // In production, could send to error tracking service via postMessage to main thread
  }
};

messaging.onBackgroundMessage((payload) => {
  logger.info('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
