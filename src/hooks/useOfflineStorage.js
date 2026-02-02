import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  saveDraft,
  getDraft,
  deleteDraft,
  addPendingSync,
  getPendingSyncs,
  removePendingSync,
  isOnline,
} from '../utils/storageUtils';

export function useOfflineStorage() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePendingCount = () => {
      const pending = getPendingSyncs();
      setPendingCount(pending.length);
    };

    updatePendingCount();

    const handleOnline = () => {
      setOnline(true);
      syncPendingReports();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingReports = useCallback(async () => {
    if (!isOnline() || syncing) return;

    const pending = getPendingSyncs();
    if (pending.length === 0) return;

    setSyncing(true);

    for (const item of pending) {
      try {
        const reportData = {
          ...item,
          reportDate: Timestamp.fromDate(new Date(item.reportDate)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        delete reportData.id;
        delete reportData.pendingSince;

        await addDoc(collection(db, 'dailyReports'), reportData);
        removePendingSync(item.id);
      } catch (error) {
        console.error('同期エラー:', error);
      }
    }

    setPendingCount(getPendingSyncs().length);
    setSyncing(false);
  }, [syncing]);

  const saveOffline = useCallback((reportId, data) => {
    return saveDraft(reportId, data);
  }, []);

  const loadOffline = useCallback((reportId) => {
    return getDraft(reportId);
  }, []);

  const clearOffline = useCallback((reportId) => {
    return deleteDraft(reportId);
  }, []);

  const queueForSync = useCallback((reportData) => {
    const id = addPendingSync(reportData);
    setPendingCount(getPendingSyncs().length);
    return id;
  }, []);

  return {
    online,
    syncing,
    pendingCount,
    saveOffline,
    loadOffline,
    clearOffline,
    queueForSync,
    syncPendingReports,
  };
}
