import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

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

        const sitesRef = collection(db, 'companies', companyId, 'sites');
        const snapshot = await getDocs(sitesRef);
        logs.push(`[2] Total docs fetched: ${snapshot.docs.length}`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        logs.push(`[3] Today (for filter): ${today.toISOString()}`);

        const allSites = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Site));

        // 各サイトのフィルタリング結果をログに記録
        const filterResults: string[] = [];
        const data = allSites.filter((site) => {
          const reasons: string[] = [];

          if (site.status !== 'active') {
            reasons.push(`status=${site.status} (not active)`);
          }

          if (site.startDate) {
            const start = site.startDate.toDate ? site.startDate.toDate() : new Date(site.startDate);
            if (start > today) {
              reasons.push(`startDate=${start.toISOString()} > today`);
            }
          }

          if (site.endDate) {
            const end = site.endDate.toDate ? site.endDate.toDate() : new Date(site.endDate);
            end.setHours(23, 59, 59, 999);
            if (end < today) {
              reasons.push(`endDate=${end.toISOString()} < today`);
            }
          }

          const included = reasons.length === 0 && site.status === 'active';
          filterResults.push(`  ${site.siteName}: ${included ? '✓' : '✗'} ${reasons.join(', ')}`);

          return included;
        }).sort((a, b) => (a.siteName || '').localeCompare(b.siteName || ''));

        logs.push(`[4] Filter results:\n${filterResults.join('\n')}`);
        logs.push(`[5] Final filtered count: ${data.length}`);

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
