import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, requestNotificationPermission, onMessageListener } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function useNotification() {
  const { currentUser, companyId } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (permission === 'granted') {
      onMessageListener()
        .then((payload) => {
          console.log('フォアグラウンドメッセージ:', payload);
          if (payload.notification) {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/icon-192.png',
            });
          }
        })
        .catch((err) => console.error('メッセージリスナーエラー:', err));
    }
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (!currentUser || !companyId) return null;

    setLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();

      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');

        const userRef = doc(db, 'companies', companyId, 'users', currentUser.uid);
        await updateDoc(userRef, {
          fcmToken: fcmToken,
          fcmTokenUpdatedAt: new Date(),
        });

        return fcmToken;
      } else {
        setPermission(Notification.permission);
      }

      return null;
    } catch (error) {
      console.error('通知許可エラー:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, companyId]);

  const isSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

  return {
    permission,
    token,
    loading,
    isSupported,
    requestPermission,
  };
}
