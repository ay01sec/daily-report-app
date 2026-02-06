import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import NotificationPrompt from '../components/common/NotificationPrompt';
import PullToRefresh from '../components/common/PullToRefresh';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function getEncouragementMessage() {
  const hour = new Date().getHours();
  if (hour < 10) return '今日も一日頑張りましょう！';
  if (hour < 12) return '午前の作業お疲れ様です！';
  if (hour < 14) return 'お昼休憩はとれましたか？';
  if (hour < 16) return '午後も引き続き頑張りましょう！';
  return 'お疲れ様です。日報の提出をお忘れなく！';
}

function SubmissionStatusBanner({ reports, companyInfo }) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // 今日の日報を探す
  const todayReport = reports.find((r) => {
    if (!r.reportDate) return false;
    const d = r.reportDate.toDate ? r.reportDate.toDate() : new Date(r.reportDate);
    return format(d, 'yyyy-MM-dd') === todayStr;
  });

  const isSubmitted = todayReport && (todayReport.status === 'submitted' || todayReport.status === 'approved');
  const deadline = companyInfo?.reportDeadline || '18:00';
  const [deadlineH, deadlineM] = deadline.split(':').map(Number);
  const isPastDeadline = now.getHours() > deadlineH || (now.getHours() === deadlineH && now.getMinutes() >= deadlineM);

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
        <p className="font-medium text-green-800">本日の日報は提出済みです</p>
        <p className="text-sm text-green-700 mt-2">
          PDF・QRコードを確認するには、下の一覧から該当の日報をタップしてください
        </p>
      </div>
    );
  }

  if (isPastDeadline) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
        <p className="font-medium text-orange-800">提出期限を過ぎています</p>
        <p className="text-sm text-orange-700 mt-1">本日の日報がまだ提出されていません</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <p className="font-medium text-blue-800">{getEncouragementMessage()}</p>
    </div>
  );
}

export default function HomePage() {
  const { currentUser, companyId, companyInfo } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchReports = useCallback(async () => {
    if (!companyId || !currentUser) return;

    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // 複合インデックス問題を回避するため、createdByのみでフィルタリング
      const reportsRef = collection(db, 'companies', companyId, 'dailyReports');
      const q = query(
        reportsRef,
        where('createdBy', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);

      // クライアント側で日付フィルタリングとソートを行う
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((report) => {
          if (!report.reportDate) return false;
          const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
          return reportDate >= startDate && reportDate <= endDate;
        })
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA; // 作成日の降順
        });

      setReports(data);
    } catch (error) {
      console.error('日報取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentUser, selectedMonth]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'M月d日(E)', { locale: ja });
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      options.push({ value, label });
    }
    return options;
  };

  const rejectedReports = reports.filter((r) => r.status === 'rejected');

  return (
    <PullToRefresh onRefresh={fetchReports}>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="px-4 py-6 max-w-lg mx-auto">
          <NotificationPrompt />

        {!loading && (
          <SubmissionStatusBanner reports={reports} companyInfo={companyInfo} />
        )}

        {rejectedReports.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <h3 className="font-medium text-red-800 flex items-center gap-2">
              <span>!</span>
              差戻しされた日報があります
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {rejectedReports.length}件の日報に修正が必要です
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {generateMonthOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Link
            to="/reports/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            + 新規作成
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner className="py-12" />
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">この月の日報はありません</p>
            <Link
              to="/reports/new"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              新しい日報を作成する
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                to={
                  report.status === 'draft' || report.status === 'rejected' || report.status === 'signed'
                    ? `/reports/${report.id}/edit`
                    : `/reports/${report.id}`
                }
                className={`block rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow ${
                  report.status === 'rejected'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(report.reportDate)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {report.siteName}
                    </p>
                    {report.status === 'rejected' && (
                      <p className="text-xs text-red-600 mt-1">
                        修正が必要です
                      </p>
                    )}
                  </div>
                  <StatusBadge status={report.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      </div>
    </PullToRefresh>
  );
}
