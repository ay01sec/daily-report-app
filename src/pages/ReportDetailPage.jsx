import { useState, useEffect, useRef } from 'react';
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
  const [showQrModal, setShowQrModal] = useState(false);
  const prevStatusRef = useRef(null);

  // ステータスが submitted → approved に変わったらQRモーダルを自動表示
  useEffect(() => {
    if (report?.status === 'approved' && report?.qrCodeUrl) {
      // 前のステータスがsubmittedだった場合のみ自動表示
      if (prevStatusRef.current === 'submitted') {
        setShowQrModal(true);
      }
    }
    prevStatusRef.current = report?.status;
  }, [report?.status, report?.qrCodeUrl]);

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

        {/* 承認待ち表示 */}
        {report.status === 'submitted' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="font-medium text-blue-800">承認待ち</p>
                <p className="text-sm text-blue-600">
                  承認されるとQRコードが表示されます
                </p>
              </div>
            </div>
          </div>
        )}

        {report.status === 'rejected' && report.rejection?.reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-medium text-red-800">差戻し理由</h3>
            <p className="text-sm text-red-700 mt-1">{report.rejection.reason}</p>
            {report.rejection.rejectedByName && (
              <p className="text-xs text-red-500 mt-1">
                差戻し者: {report.rejection.rejectedByName}
              </p>
            )}
          </div>
        )}

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
          {report.weather && (
            <div>
              <span className="text-xs text-gray-500">天候</span>
              <p className="font-medium">
                {{ sunny: '☀️ 晴れ', cloudy: '☁️ 曇り', rainy: '🌧️ 雨', snowy: '❄️ 雪' }[report.weather] || report.weather}
              </p>
            </div>
          )}
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

        {report.photos?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-2">写真</h3>
            <div className="grid grid-cols-3 gap-2">
              {report.photos.map((photo, index) => (
                <a
                  key={index}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                >
                  <img
                    src={photo.url}
                    alt={`写真 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
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

        {/* PDF・QRコード */}
        {report.status === 'approved' && report.pdfUrl && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-medium text-gray-900 mb-3">PDF・QRコード</h3>
            <div className="flex gap-3">
              <a
                href={report.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                PDF表示
              </a>
              {report.qrCodeUrl && (
                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex-1 py-3 bg-gray-600 text-white rounded-lg font-medium text-center hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  QRコード
                </button>
              )}
            </div>
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

      {/* QRコードモーダル */}
      {showQrModal && report.qrCodeUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">QRコード</h3>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </button>
              </div>
              <div className="flex flex-col items-center">
                <img
                  src={report.qrCodeUrl}
                  alt="QRコード"
                  className="w-56 h-56 border border-gray-200 rounded-lg"
                />
                <p className="text-sm text-gray-500 mt-4 text-center">
                  このQRコードをスキャンすると<br />日報PDFが表示されます
                </p>
                <a
                  href={report.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  PDFを開く
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
