import { useEffect, useState, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../contexts/AuthContext';
import { cacheSites, cacheEmployees, getCachedSites, getCachedEmployees } from '../utils/storageUtils';

interface PrefetchResult {
  prefetching: boolean;
  prefetched: boolean;
  sitesCount: number;
  employeesCount: number;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePrefetchMasterData(): PrefetchResult {
  const { companyId } = useAuth();
  const [prefetching, setPrefetching] = useState(false);
  const [prefetched, setPrefetched] = useState(false);
  const [sitesCount, setSitesCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const prefetchData = useCallback(async () => {
    if (!companyId || prefetching) return;

    setPrefetching(true);
    setError(null);

    try {
      // ネットワーク状態を確認
      // Android では isInternetReachable が null を返すことがあるため !== false で判定
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      if (isOnline) {
        // オンライン：Firebaseから取得してキャッシュに保存
        console.log('[Prefetch] オンライン - Firebaseからマスターデータを取得中...');

        // 現場データを取得
        const sitesSnapshot = await firestore()
          .collection('companies')
          .doc(companyId)
          .collection('sites')
          .get();

        const sites = sitesSnapshot.docs.map((doc) => {
          const docData = doc.data();
          return {
            id: doc.id,
            siteName: docData.siteName,
            status: docData.status,
            startDate: docData.startDate?.toDate?.() ? docData.startDate.toDate().toISOString() : docData.startDate,
            endDate: docData.endDate?.toDate?.() ? docData.endDate.toDate().toISOString() : docData.endDate,
          };
        });
        await cacheSites(companyId, sites);
        setSitesCount(sites.length);
        console.log(`[Prefetch] 現場データ: ${sites.length}件をキャッシュしました`);

        // 従業員データを取得
        const employeesSnapshot = await firestore()
          .collection('companies')
          .doc(companyId)
          .collection('employees')
          .get();

        const employees = employeesSnapshot.docs.map((doc) => {
          const docData = doc.data();
          return {
            id: doc.id,
            firstName: docData.firstName,
            lastName: docData.lastName,
            fullName: `${docData.lastName || ''}${docData.firstName || ''}`,
            isActive: docData.isActive,
            contact: docData.contact,
          };
        });
        await cacheEmployees(companyId, employees);
        setEmployeesCount(employees.length);
        console.log(`[Prefetch] 従業員データ: ${employees.length}件をキャッシュしました`);

        setPrefetched(true);
      } else {
        // オフライン：キャッシュの存在確認のみ
        console.log('[Prefetch] オフライン - キャッシュを確認中...');

        const cachedSites = await getCachedSites(companyId);
        const cachedEmployees = await getCachedEmployees(companyId);

        if (cachedSites) {
          setSitesCount(cachedSites.length);
          console.log(`[Prefetch] キャッシュ済み現場データ: ${cachedSites.length}件`);
        }

        if (cachedEmployees) {
          setEmployeesCount(cachedEmployees.length);
          console.log(`[Prefetch] キャッシュ済み従業員データ: ${cachedEmployees.length}件`);
        }

        if (!cachedSites && !cachedEmployees) {
          console.log('[Prefetch] キャッシュデータがありません');
        }

        setPrefetched(true);
      }
    } catch (err: any) {
      console.error('[Prefetch] マスターデータ取得エラー:', err);
      setError(err);
    } finally {
      setPrefetching(false);
    }
  }, [companyId, prefetching]);

  useEffect(() => {
    if (companyId && !prefetched) {
      prefetchData();
    }
  }, [companyId, prefetched, prefetchData]);

  return {
    prefetching,
    prefetched,
    sitesCount,
    employeesCount,
    error,
    refetch: prefetchData,
  };
}
