import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import debounce from 'lodash/debounce';
import { Alert, BackHandler } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import NetInfo from '@react-native-community/netinfo';
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
  clearAllLocalReports,
  LocalReport,
  LocalPhoto,
} from '../utils/storageUtils';
import { extractSnapshot } from '../utils/firestoreUtils';

// ローカルレポートの型をエクスポート
export type { LocalReport } from '../utils/storageUtils';

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
  clearAllLocalData: () => Promise<boolean>;
  getPendingLocalReports: () => Promise<LocalReport[]>;
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

      // Firebase IDがない = まだ同期されていない新規レポート
      const isNewReport = !r.firebaseId;
      const hasUnuploadedSignature = r.status === 'signed' && r.signatureLocalPath && !r.signatureFirebaseUrl;
      const hasUnuploadedPhotos = r.localPhotos && r.localPhotos.some(p => !p.firebaseUrl);

      return isNewReport || hasUnuploadedSignature || hasUnuploadedPhotos;
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
      const storageRef = storage().ref(storagePath);

      // base64 data URLからbase64部分を抽出してアップロード
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      console.log(`[Sync] 写真アップロード中: ${localPhoto.fileName}`);
      await storageRef.putString(base64Data, 'base64', { contentType: 'image/png' });
      console.log(`[Sync] 写真アップロード完了: ${localPhoto.fileName}`);

      const firebaseUrl = await storageRef.getDownloadURL();
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
    // isInternetReachable が null の場合は isConnected のみで判定
    const isOnline = netState.isConnected === true &&
      (netState.isInternetReachable === true || netState.isInternetReachable === null);
    if (!isOnline || !companyId) {
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
      console.log(`[Sync] レポート判定: localId=${r.localId}, companyId=${r.companyId}, status=${r.status}, firebaseId=${r.firebaseId}`);
      console.log(`[Sync]   signatureLocalPath=${r.signatureLocalPath}`);
      console.log(`[Sync]   signatureFirebaseUrl=${r.signatureFirebaseUrl}`);
      console.log(`[Sync]   localPhotos count=${r.localPhotos?.length || 0}`);

      if (r.companyId !== companyId) {
        console.log(`[Sync] スキップ (companyId不一致): ${r.localId} - レポート:${r.companyId} vs 現在:${companyId}`);
        return false;
      }

      // Firebase IDがない = まだ同期されていない新規レポート
      const isNewReport = !r.firebaseId;
      const hasUnuploadedSignature = r.status === 'signed' && r.signatureLocalPath && !r.signatureFirebaseUrl;
      const hasUnuploadedPhotos = r.localPhotos && r.localPhotos.some(p => !p.firebaseUrl);

      console.log(`[Sync]   isNewReport=${isNewReport}, hasUnuploadedSignature=${hasUnuploadedSignature}, hasUnuploadedPhotos=${hasUnuploadedPhotos}`);

      if (!isNewReport && !hasUnuploadedSignature && !hasUnuploadedPhotos) {
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
            // 新規ドキュメントを作成（重複検出は行わない - 各オフラインレポートは独立したドキュメントとして作成）
            console.log(`[Sync] Firebase IDなし、新規作成開始: ${report.localId}`);
            console.log(`[Sync] formData.createdBy: ${report.formData.createdBy}`);
            console.log(`[Sync] formData.siteId: ${report.formData.siteId}`);
            console.log(`[Sync] formData.reportDate: ${report.formData.reportDate}`);

            // createdByが空の場合はエラー
            if (!report.formData.createdBy) {
              console.error('[Sync] createdByが未設定のためスキップ:', report.localId);
              hasError = true;
              errorMessage = 'ユーザー情報が取得できません。再ログインしてください。';
              break;
            }

            const photosForFirebase = (report.formData.photos || [])
              .filter((p: any) => !p.isLocal)
              .map((p: any) => ({ url: p.url, path: p.path, name: p.name }));

            // ローカルのステータスを保持（draft または signed）
            const syncStatus = report.status === 'signed' ? 'signed' : 'draft';
            console.log(`[Sync] 同期ステータス: ${syncStatus}`);

            const reportData = {
              companyId,
              siteId: report.formData.siteId || '',
              siteName: report.formData.siteName || '',
              reportDate: report.formData.reportDate
                ? firestore.Timestamp.fromDate(new Date(report.formData.reportDate))
                : firestore.Timestamp.now(),
              createdBy: report.formData.createdBy,
              createdByName: report.formData.createdByName || '',
              workers: report.formData.workers || [],
              notes: report.formData.notes || '',
              weather: report.formData.weather || '',
              photos: photosForFirebase,
              status: syncStatus,
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
              createdAt: firestore.FieldValue.serverTimestamp(),
              updatedAt: firestore.FieldValue.serverTimestamp(),
            };

            console.log(`[Sync] Firestore新規作成開始: companyId=${companyId}, createdBy=${reportData.createdBy}`);
            const docRef = await firestore()
              .collection('companies')
              .doc(companyId)
              .collection('dailyReports')
              .add(reportData);
            firebaseReportId = docRef.id;
            console.log(`[Sync] 日報作成完了: ${firebaseReportId}, createdBy=${reportData.createdBy}`);

            report.firebaseId = firebaseReportId;
            await saveLocalReport(report);
            console.log(`[Sync] Firebase ID保存: ${firebaseReportId}`);
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
              const currentDocRef = firestore()
                .collection('companies')
                .doc(companyId)
                .collection('dailyReports')
                .doc(firebaseReportId!);
              const currentDoc = await currentDocRef.get();
              const { exists: docExists, data: docData } = extractSnapshot(currentDoc);
              const currentPhotos: any[] = docExists ? (docData?.photos || []) : [];

              const existingUrls = new Set(currentPhotos.map((p: any) => p.url));
              const photosToAdd = newlyUploadedPhotos.filter(p => !existingUrls.has(p.url));

              if (photosToAdd.length > 0) {
                await currentDocRef.update({
                  photos: [...currentPhotos, ...photosToAdd],
                  updatedAt: firestore.FieldValue.serverTimestamp(),
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
            // 新規ドキュメントなので常に署名をアップロード
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

            // Storageルールに合わせたパス: signatures/{companyId}/{reportId}/{timestamp}.png
            const timestamp = Date.now();
            const fileName = `signatures/${companyId}/${firebaseReportId}/signature_${timestamp}.png`;
            const storageRef = storage().ref(fileName);

            // base64 data URLからbase64部分を抽出してアップロード
            const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
            console.log(`[Sync] 署名アップロード中...`);
            await storageRef.putString(base64Data, 'base64', { contentType: 'image/png' });
            console.log(`[Sync] 署名アップロード完了`);

            const signatureUrl = await storageRef.getDownloadURL();

            // 署名情報とステータスを更新（signedに変更）
            console.log(`[Sync] Firestore署名更新開始: ${firebaseReportId}, companyId=${companyId}`);
            await firestore()
              .collection('companies')
              .doc(companyId)
              .collection('dailyReports')
              .doc(firebaseReportId!)
              .update({
                'clientSignature.imageUrl': signatureUrl,
                'clientSignature.signedAt': firestore.FieldValue.serverTimestamp(),
                'clientSignature.signerName': report.formData.signerName || '',
                status: 'signed',  // ステータスもsignedに更新
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
            console.log(`[Sync] Firestore署名更新成功: ${firebaseReportId}, status=signed`);

            report.signatureFirebaseUrl = signatureUrl;
            console.log(`[Sync] 署名アップロード完了: ${firebaseReportId}`);
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
        // エラー時は処理済みフラグをクリアして再試行可能にする
        processedLocalIdsRef.current.clear();
        handleSyncError(errorMessage, false);
      } else if (syncedCount > 0) {
        console.log(`[Sync] 全ての同期が完了: ${syncedCount}件`);
        Alert.alert('同期完了', `${syncedCount}件の日報を同期しました。提出するには日報を開いて「提出」ボタンを押してください。`, [{ text: 'OK' }]);
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

        const existingDocs = await firestore()
          .collection('companies')
          .doc(companyId)
          .collection('dailyReports')
          .where('createdBy', '==', item.createdBy || '')
          .get();
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
          reportDate: firestore.Timestamp.fromDate(new Date(item.reportDate)),
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        delete reportData.id;
        delete reportData.pendingSince;

        await firestore()
          .collection('companies')
          .doc(companyId)
          .collection('dailyReports')
          .add(reportData);
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
            // エラー時は次回再接続で再試行できるようにフラグをリセット
            hasSyncedOnReconnect.current = false;
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
      // isInternetReachable が null の場合は isConnected のみで判定
      // Android では isInternetReachable が null を返すことがある
      const isConnected = state.isConnected === true &&
        (state.isInternetReachable === true || state.isInternetReachable === null);
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

  const clearAllLocalDataCallback = useCallback(async () => {
    const result = await clearAllLocalReports();
    if (result) {
      processedLocalIdsRef.current.clear();
      await updatePendingCount();
    }
    return result;
  }, [updatePendingCount]);

  // 同期待ちのローカルレポートを取得
  const getPendingLocalReportsCallback = useCallback(async (): Promise<LocalReport[]> => {
    if (!companyId) return [];

    const localReports = await getLocalReports();
    return localReports.filter(r => {
      if (r.companyId !== companyId) return false;

      // Firebase IDがない = まだ同期されていない新規レポート
      const isNewReport = !r.firebaseId;
      const hasUnuploadedSignature = r.status === 'signed' && r.signatureLocalPath && !r.signatureFirebaseUrl;
      const hasUnuploadedPhotos = r.localPhotos && r.localPhotos.some(p => !p.firebaseUrl);

      return isNewReport || hasUnuploadedSignature || hasUnuploadedPhotos;
    });
  }, [companyId]);

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
    clearAllLocalData: clearAllLocalDataCallback,
    getPendingLocalReports: getPendingLocalReportsCallback,
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
