import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../contexts/AuthContext';
import { cacheEmployees, getCachedEmployees } from '../utils/storageUtils';

export interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  isActive?: boolean;
  contact?: {
    email?: string;
  };
}

interface UseEmployeesResult {
  employees: Employee[];
  loading: boolean;
  error: Error | null;
}

export function useEmployees(): UseEmployeesResult {
  const { companyId } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    const fetchEmployees = async () => {
      try {
        setLoading(true);

        // ネットワーク状態を確認
        // Android では isInternetReachable が null を返すことがあるため !== false で判定
        const netState = await NetInfo.fetch();
        const isOnline = netState.isConnected && netState.isInternetReachable !== false;

        let allEmployees: Employee[] = [];

        if (isOnline) {
          // オンライン：Firebaseから取得してキャッシュに保存
          try {
            const snapshot = await firestore()
              .collection('companies')
              .doc(companyId)
              .collection('employees')
              .get();

            allEmployees = snapshot.docs.map((doc) => {
              const docData = doc.data();
              return {
                id: doc.id,
                firstName: docData.firstName,
                lastName: docData.lastName,
                fullName: `${docData.lastName || ''}${docData.firstName || ''}`,
                isActive: docData.isActive,
                contact: docData.contact,
              } as Employee;
            });

            // キャッシュに保存（フィルタリング前の全データ）
            await cacheEmployees(companyId, allEmployees);
          } catch (firebaseErr: any) {
            console.error('Firebase取得エラー:', firebaseErr);
            // Firebaseエラー時はキャッシュから取得を試みる
            const cached = await getCachedEmployees(companyId);
            if (cached) {
              allEmployees = cached;
            } else {
              throw firebaseErr;
            }
          }
        } else {
          // オフライン：キャッシュから取得
          const cached = await getCachedEmployees(companyId);
          if (cached) {
            allEmployees = cached;
          } else {
            setError(new Error('オフラインで、キャッシュデータがありません。ネットワークに接続してください。'));
            setLoading(false);
            return;
          }
        }

        // アクティブな従業員のみをフィルタリングしてソート
        const data = allEmployees
          .filter((emp) => emp.isActive === true)
          .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

        setEmployees(data);
        setError(null);
      } catch (err) {
        console.error('社員データ取得エラー:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [companyId]);

  return { employees, loading, error };
}
