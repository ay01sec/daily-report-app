import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function useReport(reportId) {
  const { companyId } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reportId || !companyId) {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoading(true);
        const reportRef = doc(db, 'companies', companyId, 'dailyReports', reportId);
        const snapshot = await getDoc(reportRef);

        if (snapshot.exists()) {
          setReport({
            id: snapshot.id,
            ...snapshot.data(),
          });
          setError(null);
        } else {
          setError(new Error('日報が見つかりません'));
        }
      } catch (err) {
        console.error('日報取得エラー:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, companyId]);

  return { report, loading, error };
}
