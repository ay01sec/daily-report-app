import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
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

    setLoading(true);
    const reportRef = doc(db, 'companies', companyId, 'dailyReports', reportId);

    // リアルタイムリスナーでステータス変更を監視
    const unsubscribe = onSnapshot(
      reportRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setReport({
            id: snapshot.id,
            ...snapshot.data(),
          });
          setError(null);
        } else {
          setError(new Error('日報が見つかりません'));
        }
        setLoading(false);
      },
      (err) => {
        console.error('日報取得エラー:', err);
        setError(err);
        setLoading(false);
      }
    );

    // クリーンアップ時にリスナーを解除
    return () => unsubscribe();
  }, [reportId, companyId]);

  return { report, loading, error };
}
