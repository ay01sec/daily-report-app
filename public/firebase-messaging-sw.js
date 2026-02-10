importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase設定（環境変数は Service Worker では使用できないため直接記述）
firebase.initializeApp({
  apiKey: 'AIzaSyCR6NgDKYsvrrhYVqoeAlqoz7gxiTgwisc',
  authDomain: 'labormanagement-20260202.firebaseapp.com',
  projectId: 'labormanagement-20260202',
  storageBucket: 'labormanagement-20260202.firebasestorage.app',
  messagingSenderId: '1072304386771',
  appId: '1:1072304386771:web:b53a5b8df10bdcb6111a26',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('バックグラウンドメッセージ受信:', payload);

  const notificationTitle = payload.notification?.title || '作業日報アプリ -CDS-';
  const notificationOptions = {
    body: payload.notification?.body || '新しい通知があります',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
