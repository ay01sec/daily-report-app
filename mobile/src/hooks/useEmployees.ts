import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

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
    if (!companyId) return;

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const employeesRef = collection(db, 'companies', companyId, 'employees');
        const snapshot = await getDocs(employeesRef);

        const data = snapshot.docs
          .map((doc) => {
            const docData = doc.data();
            return {
              id: doc.id,
              ...docData,
              fullName: `${docData.lastName || ''}${docData.firstName || ''}`,
            } as Employee;
          })
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
