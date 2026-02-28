import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { extractSnapshot } from '../utils/firestoreUtils';

export interface Report {
  id: string;
  reportDate?: any;
  siteId?: string;
  siteName?: string;
  weather?: string;
  workers?: any[];
  notes?: string;
  photos?: any[];
  status?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: any;
  updatedAt?: any;
  submittedAt?: any;
  clientSignature?: {
    imageUrl?: string | null;
    signedAt?: any;
    signerName?: string | null;
  };
  approval?: {
    approvedBy?: string | null;
    approvedByName?: string | null;
    approvedAt?: any;
  };
  rejection?: {
    reason?: string;
    rejectedByName?: string;
  };
  pdfUrl?: string;
  qrCodeUrl?: string;
}

interface UseReportResult {
  report: Report | null;
  loading: boolean;
  error: Error | null;
}

export function useReport(reportId: string | undefined): UseReportResult {
  const { companyId } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!reportId || !companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const reportRef = firestore()
      .collection('companies')
      .doc(companyId)
      .collection('dailyReports')
      .doc(reportId);

    const unsubscribe = reportRef.onSnapshot(
      (snapshot) => {
        const { exists: docExists, data: docData } = extractSnapshot(snapshot);
        if (docExists) {
          setReport({
            id: snapshot.id,
            ...docData,
          } as Report);
          setError(null);
        } else {
          setError(new Error('日報が見つかりません'));
        }
        setLoading(false);
      },
      (err: any) => {
        // permission-deniedエラーはログアウト時に発生する想定内のエラーなので無視
        if (err?.code === 'firestore/permission-denied') {
          console.log('[useReport] 権限エラー（ログアウト中の可能性）');
          setLoading(false);
          return;
        }
        console.error('日報取得エラー:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId, companyId]);

  return { report, loading, error };
}
