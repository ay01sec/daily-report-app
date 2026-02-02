import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function useEmployees() {
  const { companyId } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const employeesRef = collection(db, 'companies', companyId, 'employees');
        // シンプルなクエリで全件取得し、クライアント側でフィルタ・ソート
        const snapshot = await getDocs(employeesRef);

        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            fullName: `${doc.data().lastName || ''}${doc.data().firstName || ''}`,
          }))
          .filter((emp) => emp.isActive === true)
          .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

        setEmployees(data);
        setError(null);
      } catch (err) {
        console.error('社員データ取得エラー:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [companyId]);

  return { employees, loading, error };
}
