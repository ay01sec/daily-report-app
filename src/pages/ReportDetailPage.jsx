import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import StatusBadge from '../components/common/StatusBadge';
import SignatureDisplay from '../components/report/SignatureDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useReport } from '../hooks/useReport';
import { formatDate, formatDateTime } from '../utils/dateUtils';

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { report, loading, error } = useReport(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <LoadingSpinner className="py-12" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="px-4 py-6 max-w-lg mx-auto">
          <ErrorMessage message={error?.message || '日報が見つかりません'} />
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ホームに戻る
          </button>
        </main>
      </div>
    );
  }

  const canEdit = report.status === 'draft' || report.status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">日報詳細</h2>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            戻る
          </button>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={report.status} />
          {report.submittedAt && (
            <span className="text-sm text-gray-500">
              送信: {formatDateTime(report.submittedAt)}
            </span>
          )}
        </div>

        {report.clientSignature?.imageUrl && (
          <SignatureDisplay
            imageUrl={report.clientSignature.imageUrl}
            signedAt={report.clientSignature.signedAt}
            signerName={report.clientSignature.signerName}
          />
        )}

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div>
            <span className="text-xs text-gray-500">実施日</span>
            <p className="font-medium">{formatDate(report.reportDate)}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">現場名</span>
            <p className="font-medium">{report.siteName}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">作成者</span>
            <p className="font-medium">{report.createdByName}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">作業員</h3>
          <div className="space-y-3">
            {report.workers?.map((worker, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 text-sm space-y-1"
              >
                <div className="font-medium text-gray-900">{worker.name}</div>
                <div className="text-gray-600">
                  {worker.startTime} - {worker.endTime}
                  {worker.noLunchBreak && (
                    <span className="ml-2 text-orange-600">(昼休憩なし)</span>
                  )}
                </div>
                {worker.remarks && (
                  <div className="text-gray-500">{worker.remarks}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {report.notes && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-2">連絡事項</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{report.notes}</p>
          </div>
        )}

        {report.approval?.approvedAt && (
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <h3 className="font-medium text-green-800 mb-2">承認情報</h3>
            <p className="text-sm text-green-700">
              承認者: {report.approval.approvedByName}
            </p>
            <p className="text-sm text-green-700">
              承認日時: {formatDateTime(report.approval.approvedAt)}
            </p>
          </div>
        )}

        {canEdit && (
          <div className="pt-4">
            <Link
              to={`/reports/${id}/edit`}
              className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors"
            >
              編集する
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
