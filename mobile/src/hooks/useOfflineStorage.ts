import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../config/firebase';
import {
  saveDraft,
  getDraft,
  deleteDraft,
  addPendingSync,
  getPendingSyncs,
  removePendingSync,
} from '../utils/storageUtils';

interface UseOfflineStorageResult {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  saveOffline: (reportId: string, data: any) => Promise<string | null>;
  loadOffline: (reportId: string) => Promise<any | null>;
  clearOffline: (reportId: string) => Promise<boolean>;
  queueForSync: (reportData: any) => Promise<string | null>;
  syncPendingReports: () => Promise<void>;
}

export function useOfflineStorage(): UseOfflineStorageResult {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = useCallback(async () => {
    const pending = await getPendingSyncs();
    setPendingCount(pending.length);
  }, []);

  const syncPendingReports = useCallback(async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || syncing) return;

    const pending = await getPendingSyncs();
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
        await removePendingSync(item.id);
      } catch (error) {
        console.error('同期エラー:', error);
      }
    }

    await updatePendingCount();
    setSyncing(false);
  }, [syncing, updatePendingCount]);

  useEffect(() => {
    updatePendingCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;
      setOnline(isConnected);

      if (isConnected) {
        syncPendingReports();
      }
    });

    return () => unsubscribe();
  }, [updatePendingCount, syncPendingReports]);

  const saveOfflineCallback = useCallback(async (reportId: string, data: any) => {
    return saveDraft(reportId, data);
  }, []);

  const loadOfflineCallback = useCallback(async (reportId: string) => {
    return getDraft(reportId);
  }, []);

  const clearOfflineCallback = useCallback(async (reportId: string) => {
    return deleteDraft(reportId);
  }, []);

  const queueForSyncCallback = useCallback(async (reportData: any) => {
    const id = await addPendingSync(reportData);
    await updatePendingCount();
    return id;
  }, [updatePendingCount]);

  return {
    online,
    syncing,
    pendingCount,
    saveOffline: saveOfflineCallback,
    loadOffline: loadOfflineCallback,
    clearOffline: clearOfflineCallback,
    queueForSync: queueForSyncCallback,
    syncPendingReports,
  };
}
