import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

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
    const reportRef = doc(db, 'companies', companyId, 'dailyReports', reportId);

    const unsubscribe = onSnapshot(
      reportRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setReport({
            id: snapshot.id,
            ...snapshot.data(),
          } as Report);
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

    return () => unsubscribe();
  }, [reportId, companyId]);

  return { report, loading, error };
}
