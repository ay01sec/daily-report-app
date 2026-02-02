import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function useSites() {
  const { companyId } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchSites = async () => {
      try {
        setLoading(true);
        const sitesRef = collection(db, 'companies', companyId, 'sites');
        // シンプルなクエリで全件取得し、クライアント側でフィルタ・ソート
        const snapshot = await getDocs(sitesRef);

        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((site) => site.status === 'active')
          .sort((a, b) => (a.siteName || '').localeCompare(b.siteName || ''));

        setSites(data);
        setError(null);
      } catch (err) {
        console.error('現場データ取得エラー:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [companyId]);

  return { sites, loading, error };
}
