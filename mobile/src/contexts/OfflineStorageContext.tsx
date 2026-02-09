import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import debounce from 'lodash/debounce';
import { Alert, BackHandler } from 'react-native';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import { db, storage } from '../config/firebase';
import { useAuth } from './AuthContext';
import {
  saveDraft,
  getDraft,
  deleteDraft,
  addPendingSync,
  getPendingSyncs,
  removePendingSync,
  getLocalReports,
  saveLocalReport,
  deleteLocalReport,
  loadSignatureLocally,
  loadPhotoLocally,
  LocalReport,
  LocalPhoto,
} from '../utils/storageUtils';

interface OfflineStorageContextValue {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  syncError: string | null;
  saveOffline: (reportId: string, data: any) => Promise<string | null>;
  loadOffline: (reportId: string) => Promise<any | null>;
  clearOffline: (reportId: string) => Promise<boolean>;
  queueForSync: (reportData: any) => Promise<string | null>;
  syncPendingReports: () => Promise<void>;
  syncLocalReports: () => Promise<void>;
}

const OfflineStorageContext = createContext<OfflineStorageContextValue | undefined>(undefined);

interface OfflineStorageProviderProps {
  children: ReactNode;
}

export function OfflineStorageProvider({ children }: OfflineStorageProviderProps) {
  const { companyId } = useAuth();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 同期制御用のRef（繰り返し防止）
  const isSyncingRef = useRef(false);
  const hasSyncedOnReconnect = useRef(false);
  const wasOnlineRef = useRef(true);
  const lastSyncTimeRef = useRef(0);
  const processedLocalIdsRef = useRef<Set<string>>(new Set());

  const SYNC_COOLDOWN_MS = 30000;

  const updatePendingCount = useCallback(async () => {
    if (!companyId) {
      setPendingCount(0);
      return;
    }

    const pending = await getPendingSyncs();
    const localReports = await getLocalReports();

    console.log('[updatePendingCount] localReports:', localReports.length);
    localReports.forEach(r => {
      console.log(`  - ${r.localId}: status=${r.status}, companyId=${r.companyId}, signatureLocalPath=${r.signatureLocalPath}, signatureFirebaseUrl=${r.signatureFirebaseUrl}, localPhotos=${r.localPhotos?.length || 0}`);
    });

    const pendingLocalReports = localReports.filter(r => {
      if (r.companyId !== companyId) return false;

      const hasUnuploadedSignature = r.status === 'signed' && r.signatureLocalPath && !r.signatureFirebaseUrl;
      const hasUnuploadedPhotos = r.localPhotos && r.localPhotos.some(p => !p.firebaseUrl);

      return hasUnuploadedSignature || hasUnuploadedPhotos;
    });

    console.log('[updatePendingCount] pending:', pending.length, 'pendingLocalReports:', pendingLocalReports.length);
    setPendingCount(pending.length + pendingLocalReports.length);
  }, [companyId]);

  const handleSyncError = useCallback((errorMessage: string, forceExit: boolean = false) => {
    console.error('[Sync] handleSyncError:', errorMessage);
    setSyncError(errorMessage);

    if (forceExit) {
      Alert.alert(
        '同期エラー',
        'データベースの同期エラーのため強制終了します。再度アプリを開いて操作を行ってください。',
        [
          {
            text: '確認',
            onPress: () => {
              BackHandler.exitApp();
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        '同期エラー',
        `同期中にエラーが発生しました。後で再試行してください。\n\n詳細: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    }
  }, []);

  const uploadLocalPhoto = async (
    localPhoto: LocalPhoto,
    reportId: string,
    companyId: string
  ): Promise<{ firebaseUrl: string; firebasePath: string } | null> => {
    try {
      const base64 = await loadPhotoLocally(localPhoto.localPath);
      if (!base64) {
        console.error('写真が見つかりません:', localPhoto.localPath);
        return null;
      }

      const storagePath = `companies/${companyId}/reports/${reportId}/photos/${localPhoto.fileName}`;
      const storageRef = ref(storage, storagePath);

      const response = await fetch(base64);
      const blob = await response.blob();

      await new Promise<void>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, blob);
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`[Sync] 写真アップロード進捗: ${progress.toFixed(1)}%`);
          },
          (error) => reject(error),
          () => resolve()
        );
      });

      const firebaseUrl = await getDownloadURL(storageRef);
      return { firebaseUrl, firebasePath: storagePath };
    } catch (error) {
      console.error('写真アップロードエラー:', error);
      return null;
    }
  };

  const syncLocalReports = useCallback(async () => {
    if (isSyncingRef.current) {
      console.log('[Sync] 既に同期中のためスキップ');
      return;
    }

    isSyncingRef.current = true;
    setSyncing(true);
    console.log('[Sync] ロック取得');

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable || !companyId) {
      console.log('[Sync] オフラインまたはcompanyIdがないためスキップ');
      isSyncingRef.current = false;
      setSyncing(false);
      return;
    }

    lastSyncTimeRef.current = Date.now();

    const localReports = await getLocalReports();

    console.log('[Sync] 全ローカルレポート:', localReports.length);
    localReports.forEach(r => {
      console.log(`[Sync]   - ${r.localId}: companyId=${r.companyId}, status=${r.status}, signaturePath=${r.signatureLocalPath}, signatureUrl=${r.signatureFirebaseUrl}`);
    });

    const pendingReports = localReports.filter(r => {
      console.log(`[Sync] レポート判定: localId=${r.localId}, companyId=${r.companyId}, status=${r.status}`);
      console.log(`[Sync]   signatureLocalPath=${r.signatureLocalPath}`);
      console.log(`[Sync]   signatureFirebaseUrl=${r.signatureFirebaseUrl}`);
      console.log(`[Sync]   localPhotos count=${r.localPhotos?.length || 0}`);

      if (r.companyId !== companyId) {
        console.log(`[Sync] スキップ (companyId不一致): ${r.localId} - レポート:${r.companyId} vs 現在:${companyId}`);
        return false;
      }

      const hasUnuploadedSignature = r.status === 'signed' && r.signatureLocalPath && !r.signatureFirebaseUrl;
      const hasUnuploadedPhotos = r.localPhotos && r.localPhotos.some(p => !p.firebaseUrl);

      console.log(`[Sync]   hasUnuploadedSignature=${hasUnuploadedSignature}, hasUnuploadedPhotos=${hasUnuploadedPhotos}`);

      if (!hasUnuploadedSignature && !hasUnuploadedPhotos) {
        console.log(`[Sync] スキップ (同期不要): ${r.localId}`);
        return false;
      }

      console.log(`[Sync] 同期対象: ${r.localId}`);
      return true;
    });

    if (pendingReports.length === 0) {
      console.log('[Sync] 同期対象なし');
      isSyncingRef.current = false;
      setSyncing(false);
      return;
    }

    console.log(`[Sync] 同期開始: ${pendingReports.length}件`);

    let hasError = false;
    let errorMessage = '';
    const reportsToDelete: string[] = [];

    try {
      for (const report of pendingReports) {
        if (processedLocalIdsRef.current.has(report.localId)) {
          console.log(`[Sync] 既に処理済みのためスキップ: ${report.localId}`);
          continue;
        }
        processedLocalIdsRef.current.add(report.localId);

        try {
          let firebaseReportId = report.firebaseId;

          if (!firebaseReportId) {
            console.log(`[Sync] Firebase IDなし、既存チェック開始: ${report.localId}`);

            const reportDate = report.formData.reportDate
              ? new Date(report.formData.reportDate)
              : new Date();
            const reportDateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}`;

            const existingQuery = query(
              collection(db, 'companies', companyId, 'dailyReports'),
              where('createdBy', '==', report.formData.createdBy || '')
            );

            const existingDocs = await getDocs(existingQuery);
            const matchingDoc = existingDocs.docs.find(doc => {
              const data = doc.data();
              const docDate = data.reportDate?.toDate ? data.reportDate.toDate() : new Date(data.reportDate);
              const docDateStr = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}-${String(docDate.getDate()).padStart(2, '0')}`;
              return data.siteId === (report.formData.siteId || '') && docDateStr === reportDateStr;
            });

            if (matchingDoc) {
              firebaseReportId = matchingDoc.id;
              report.firebaseId = firebaseReportId;
              await saveLocalReport(report);
              console.log(`[Sync] 既存日報を発見、Firebase ID使用: ${firebaseReportId}`);
            } else {
              console.log(`[Sync] 既存なし、新規作成開始: ${report.localId}`);

              const photosForFirebase = (report.formData.photos || [])
                .filter((p: any) => !p.isLocal)
                .map((p: any) => ({ url: p.url, path: p.path, name: p.name }));

              const reportData = {
                companyId,
                siteId: report.formData.siteId || '',
                siteName: report.formData.siteName || '',
                reportDate: report.formData.reportDate
                  ? Timestamp.fromDate(new Date(report.formData.reportDate))
                  : Timestamp.now(),
                createdBy: report.formData.createdBy || '',
                createdByName: report.formData.createdByName || '',
                workers: report.formData.workers || [],
                notes: report.formData.notes || '',
                weather: report.formData.weather || '',
                photos: photosForFirebase,
                status: 'draft',
                submittedAt: null,
                clientSignature: {
                  imageUrl: null,
                  signedAt: null,
                  signerName: null,
                },
                approval: {
                  approvedBy: null,
                  approvedByName: null,
                  approvedAt: null,
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };

              const docRef = await addDoc(
                collection(db, 'companies', companyId, 'dailyReports'),
                reportData
              );
              firebaseReportId = docRef.id;
              console.log(`[Sync] 日報作成完了: ${firebaseReportId}`);

              report.firebaseId = firebaseReportId;
              await saveLocalReport(report);
              console.log(`[Sync] Firebase ID保存: ${firebaseReportId}`);
            }
          } else {
            console.log(`[Sync] 既存Firebase ID使用: ${firebaseReportId}`);
          }

          if (report.localPhotos && report.localPhotos.length > 0) {
            const updatedLocalPhotos: LocalPhoto[] = [];
            const newlyUploadedPhotos: { url: string; path: string; name: string }[] = [];
            let hasPhotoNotFound = false;

            for (const localPhoto of report.localPhotos) {
              if (localPhoto.firebaseUrl) {
                console.log(`[Sync] 写真スキップ (アップロード済み): ${localPhoto.fileName}`);
                updatedLocalPhotos.push(localPhoto);
              } else {
                const base64 = await loadPhotoLocally(localPhoto.localPath);
                if (!base64) {
                  console.log(`[Sync] 写真ファイルが見つかりません。スキップ: ${localPhoto.localPath}`);
                  hasPhotoNotFound = true;
                  continue;
                }

                const result = await uploadLocalPhoto(localPhoto, firebaseReportId!, companyId);
                if (result) {
                  updatedLocalPhotos.push({
                    ...localPhoto,
                    firebaseUrl: result.firebaseUrl,
                    firebasePath: result.firebasePath,
                  });
                  newlyUploadedPhotos.push({
                    url: result.firebaseUrl,
                    path: result.firebasePath,
                    name: localPhoto.fileName,
                  });
                  console.log(`[Sync] 写真アップロード完了: ${localPhoto.fileName}`);
                } else {
                  updatedLocalPhotos.push(localPhoto);
                }
              }
            }

            if (newlyUploadedPhotos.length > 0) {
              const currentDoc = await getDoc(doc(db, 'companies', companyId, 'dailyReports', firebaseReportId!));
              const currentPhotos: any[] = currentDoc.exists() ? (currentDoc.data()?.photos || []) : [];

              const existingUrls = new Set(currentPhotos.map((p: any) => p.url));
              const photosToAdd = newlyUploadedPhotos.filter(p => !existingUrls.has(p.url));

              if (photosToAdd.length > 0) {
                await updateDoc(doc(db, 'companies', companyId, 'dailyReports', firebaseReportId!), {
                  photos: [...currentPhotos, ...photosToAdd],
                  updatedAt: serverTimestamp(),
                });
                console.log(`[Sync] Firestore写真更新: 既存${currentPhotos.length}件 + 新規${photosToAdd.length}件`);
              } else {
                console.log(`[Sync] 写真は全て既にFirestoreに存在: ${newlyUploadedPhotos.length}件スキップ`);
              }
            }

            report.localPhotos = updatedLocalPhotos;

            if (hasPhotoNotFound) {
              console.log(`[Sync] 一部の写真ファイルが見つからなかったため、同期キューから削除しました`);
            }
          }

          console.log(`[Sync] 署名チェック: status=${report.status}, signatureLocalPath=${report.signatureLocalPath}, signatureFirebaseUrl=${report.signatureFirebaseUrl}`);

          if (report.status === 'signed' && report.signatureLocalPath && !report.signatureFirebaseUrl) {
            const currentDoc = await getDoc(doc(db, 'companies', companyId, 'dailyReports', firebaseReportId!));
            const existingSignatureUrl = currentDoc.exists() ? currentDoc.data()?.clientSignature?.imageUrl : null;

            if (existingSignatureUrl) {
              console.log(`[Sync] 署名は既にFirestoreに存在: ${existingSignatureUrl}`);
              report.signatureFirebaseUrl = existingSignatureUrl;
              await saveLocalReport(report);
            } else {
              console.log(`[Sync] 署名アップロード開始: ${report.signatureLocalPath}`);
              const signatureBase64 = await loadSignatureLocally(report.signatureLocalPath);
              if (!signatureBase64) {
                console.error('[Sync] 署名画像が見つかりません:', report.signatureLocalPath);
                console.log(`[Sync] 署名ファイルが見つからないため、同期キューから削除: ${report.localId}`);
                const updatedReport: LocalReport = {
                  ...report,
                  firebaseId: firebaseReportId || report.firebaseId,
                  signatureLocalPath: undefined,
                  status: 'draft',
                };
                await saveLocalReport(updatedReport);
                reportsToDelete.push(report.localId);
                continue;
              }
              console.log(`[Sync] 署名Base64読み込み完了: ${signatureBase64.substring(0, 50)}...`);

              const fileName = `companies/${companyId}/reports/${firebaseReportId}/photos/signature_${Date.now()}.png`;
              const storageRef = ref(storage, fileName);

              const response = await fetch(signatureBase64);
              const blob = await response.blob();

              await new Promise<void>((resolve, reject) => {
                const uploadTask = uploadBytesResumable(storageRef, blob);
                uploadTask.on(
                  'state_changed',
                  (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`[Sync] 署名アップロード進捗: ${progress.toFixed(1)}%`);
                  },
                  (error) => reject(error),
                  () => resolve()
                );
              });

              const signatureUrl = await getDownloadURL(storageRef);

              await updateDoc(doc(db, 'companies', companyId, 'dailyReports', firebaseReportId!), {
                'clientSignature.imageUrl': signatureUrl,
                'clientSignature.signedAt': serverTimestamp(),
                'clientSignature.signerName': report.formData.signerName || '',
                status: 'signed',
                updatedAt: serverTimestamp(),
              });

              report.signatureFirebaseUrl = signatureUrl;
              console.log(`[Sync] 署名アップロード完了: ${firebaseReportId}`);
            }
          }

          const updatedReport: LocalReport = {
            ...report,
            firebaseId: firebaseReportId,
          };
          await saveLocalReport(updatedReport);

          console.log(`[Sync] 日報同期完了: ${firebaseReportId}`);
        } catch (error: any) {
          console.error('[Sync] 同期エラー:', error);
          hasError = true;
          errorMessage = error.message || '不明なエラー';
          break;
        }
      }

      const syncedCount = pendingReports.length - reportsToDelete.length;

      if (reportsToDelete.length > 0) {
        Alert.alert(
          '同期キュー整理',
          `署名ファイルが見つからないため、${reportsToDelete.length}件を同期キューから削除しました。該当の日報を開いて再度署名してください。`,
          [{ text: 'OK' }]
        );
      } else if (hasError) {
        handleSyncError(errorMessage, false);
      } else if (syncedCount > 0) {
        console.log(`[Sync] 全ての同期が完了: ${syncedCount}件`);
        Alert.alert('同期完了', `${syncedCount}件の日報を同期しました。`, [{ text: 'OK' }]);
      } else {
        console.log('[Sync] 同期対象なし');
      }
    } finally {
      console.log('[Sync] ロック解除');
      isSyncingRef.current = false;
      setSyncing(false);
      await updatePendingCount();
    }
  }, [companyId, updatePendingCount, handleSyncError]);

  const syncPendingReports = useCallback(async () => {
    if (isSyncingRef.current) {
      console.log('[SyncPending] 既に同期中のためスキップ');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !companyId) return;

    const pending = await getPendingSyncs();
    if (pending.length === 0) return;

    console.log(`[SyncPending] 同期開始: ${pending.length}件`);
    isSyncingRef.current = true;
    setSyncing(true);

    let hasError = false;
    let errorMessage = '';

    for (const item of pending) {
      try {
        const reportDate = item.reportDate ? new Date(item.reportDate) : new Date();
        const reportDateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}`;

        const existingQuery = query(
          collection(db, 'companies', companyId, 'dailyReports'),
          where('createdBy', '==', item.createdBy || '')
        );

        const existingDocs = await getDocs(existingQuery);
        const matchingDoc = existingDocs.docs.find(doc => {
          const data = doc.data();
          const docDate = data.reportDate?.toDate ? data.reportDate.toDate() : new Date(data.reportDate);
          const docDateStr = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}-${String(docDate.getDate()).padStart(2, '0')}`;
          return data.siteId === (item.siteId || '') && docDateStr === reportDateStr;
        });

        if (matchingDoc) {
          console.log(`[SyncPending] 既存日報あり、スキップ: ${matchingDoc.id}`);
          await removePendingSync(item.id);
          continue;
        }

        const reportData = {
          ...item,
          reportDate: Timestamp.fromDate(new Date(item.reportDate)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        delete reportData.id;
        delete reportData.pendingSince;

        await addDoc(collection(db, 'companies', companyId, 'dailyReports'), reportData);
        console.log(`[SyncPending] 新規日報作成完了`);
        await removePendingSync(item.id);
      } catch (error: any) {
        console.error('[SyncPending] 同期エラー:', error);
        hasError = true;
        errorMessage = error.message || '不明なエラー';
        break;
      }
    }

    isSyncingRef.current = false;
    setSyncing(false);
    await updatePendingCount();

    if (hasError) {
      handleSyncError(errorMessage, false);
    }
  }, [companyId, updatePendingCount, handleSyncError]);

  // debounceされたネットワーク変更ハンドラ（アプリ全体で1つのみ）
  const debouncedNetworkHandler = useMemo(
    () =>
      debounce(async (isConnected: boolean) => {
        const wasOffline = !wasOnlineRef.current;

        console.log(`[Network] 状態変化(debounced): wasOnline=${wasOnlineRef.current}, isConnected=${isConnected}`);

        wasOnlineRef.current = isConnected;
        setOnline(isConnected);

        if (isConnected && wasOffline && !hasSyncedOnReconnect.current && !isSyncingRef.current) {
          console.log('[Network] オンライン復帰を検知、同期を開始');
          hasSyncedOnReconnect.current = true;

          try {
            processedLocalIdsRef.current.clear();
            await syncPendingReports();
            await syncLocalReports();
          } catch (error) {
            console.error('[Network] 同期中にエラー:', error);
          }
        } else if (!isConnected) {
          hasSyncedOnReconnect.current = false;
          processedLocalIdsRef.current.clear();
        }
      }, 2000),
    [syncPendingReports, syncLocalReports]
  );

  useEffect(() => {
    updatePendingCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = !!(state.isConnected && state.isInternetReachable);
      debouncedNetworkHandler(isConnected);
    });

    return () => {
      unsubscribe();
      debouncedNetworkHandler.cancel();
    };
  }, [updatePendingCount, debouncedNetworkHandler]);

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

  const value: OfflineStorageContextValue = {
    online,
    syncing,
    pendingCount,
    syncError,
    saveOffline: saveOfflineCallback,
    loadOffline: loadOfflineCallback,
    clearOffline: clearOfflineCallback,
    queueForSync: queueForSyncCallback,
    syncPendingReports,
    syncLocalReports,
  };

  return (
    <OfflineStorageContext.Provider value={value}>
      {children}
    </OfflineStorageContext.Provider>
  );
}

export function useOfflineStorage(): OfflineStorageContextValue {
  const context = useContext(OfflineStorageContext);
  if (context === undefined) {
    throw new Error('useOfflineStorage must be used within an OfflineStorageProvider');
  }
  return context;
}
