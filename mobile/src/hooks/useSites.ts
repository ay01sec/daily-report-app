import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../contexts/AuthContext';
import { cacheSites, getCachedSites } from '../utils/storageUtils';

export interface Site {
  id: string;
  siteName?: string;
  status?: string;
  startDate?: any;
  endDate?: any;
}

interface UseSitesResult {
  sites: Site[];
  loading: boolean;
  error: Error | null;
  debugInfo: string | null;
}

export function useSites(): UseSitesResult {
  const { companyId } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setDebugInfo(`[useSites] companyId is null/undefined`);
      setLoading(false);
      return;
    }

    const fetchSites = async () => {
      const logs: string[] = [];
      try {
        setLoading(true);
        logs.push(`[1] Fetching sites for companyId: ${companyId}`);

        // ネットワーク状態を確認
        // Android では isInternetReachable が null を返すことがあるため !== false で判定
        const netState = await NetInfo.fetch();
        const isOnline = netState.isConnected && netState.isInternetReachable !== false;
        logs.push(`[2] Network status: ${isOnline ? 'online' : 'offline'}`);

        let allSites: Site[] = [];

        if (isOnline) {
          // オンライン：Firebaseから取得してキャッシュに保存
          try {
            const snapshot = await firestore()
              .collection('companies')
              .doc(companyId)
              .collection('sites')
              .get();
            logs.push(`[3] Total docs fetched from Firebase: ${snapshot.docs.length}`);

            allSites = snapshot.docs.map((doc) => {
              const docData = doc.data();
              return {
                id: doc.id,
                siteName: docData.siteName,
                status: docData.status,
                // Timestampをシリアライズ可能な形式に変換
                startDate: docData.startDate?.toDate?.() ? docData.startDate.toDate().toISOString() : docData.startDate,
                endDate: docData.endDate?.toDate?.() ? docData.endDate.toDate().toISOString() : docData.endDate,
              } as Site;
            });

            // キャッシュに保存
            await cacheSites(companyId, allSites);
            logs.push(`[4] Cached ${allSites.length} sites`);
          } catch (firebaseErr: any) {
            logs.push(`[ERROR] Firebase fetch failed: ${firebaseErr.message}`);
            // Firebaseエラー時はキャッシュから取得を試みる
            const cached = await getCachedSites(companyId);
            if (cached) {
              allSites = cached;
              logs.push(`[4] Using cached data: ${allSites.length} sites`);
            } else {
              throw firebaseErr;
            }
          }
        } else {
          // オフライン：キャッシュから取得
          const cached = await getCachedSites(companyId);
          if (cached) {
            allSites = cached;
            logs.push(`[3] Using cached data (offline): ${allSites.length} sites`);
          } else {
            logs.push(`[3] No cached data available`);
            setError(new Error('オフラインで、キャッシュデータがありません。ネットワークに接続してください。'));
            setDebugInfo(logs.join('\n'));
            setLoading(false);
            return;
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        logs.push(`[5] Today (for filter): ${today.toISOString()}`);

        // 各サイトのフィルタリング結果をログに記録
        const filterResults: string[] = [];
        const data = allSites.filter((site) => {
          const reasons: string[] = [];

          if (site.status !== 'active') {
            reasons.push(`status=${site.status} (not active)`);
          }

          if (site.startDate) {
            const start = typeof site.startDate === 'string' ? new Date(site.startDate) :
                          site.startDate.toDate ? site.startDate.toDate() : new Date(site.startDate);
            if (start > today) {
              reasons.push(`startDate > today`);
            }
          }

          if (site.endDate) {
            const end = typeof site.endDate === 'string' ? new Date(site.endDate) :
                        site.endDate.toDate ? site.endDate.toDate() : new Date(site.endDate);
            end.setHours(23, 59, 59, 999);
            if (end < today) {
              reasons.push(`endDate < today`);
            }
          }

          const included = reasons.length === 0 && site.status === 'active';
          filterResults.push(`  ${site.siteName}: ${included ? '✓' : '✗'} ${reasons.join(', ')}`);

          return included;
        }).sort((a, b) => (a.siteName || '').localeCompare(b.siteName || ''));

        logs.push(`[6] Filter results:\n${filterResults.join('\n')}`);
        logs.push(`[7] Final filtered count: ${data.length}`);

        setSites(data);
        setError(null);
        setDebugInfo(logs.join('\n'));
      } catch (err: any) {
        console.error('現場データ取得エラー:', err);
        logs.push(`[ERROR] ${err.name}: ${err.message}`);
        if (err.code) logs.push(`[ERROR CODE] ${err.code}`);
        setError(err as Error);
        setDebugInfo(logs.join('\n'));
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [companyId]);

  return { sites, loading, error, debugInfo };
}
