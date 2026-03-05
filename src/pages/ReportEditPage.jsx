import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject as deleteStorageObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import ReportForm from '../components/report/ReportForm';
import SignatureModal from '../components/report/SignatureModal';
import SignatureDisplay from '../components/report/SignatureDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { useReport } from '../hooks/useReport';

export default function ReportEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companyId, isServiceRestricted, getBillingStatus } = useAuth();
  const { report, loading, error } = useReport(id);
  const serviceRestricted = isServiceRestricted();

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignatureRequest = () => {
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = () => {
    setShowSignatureModal(false);
    window.location.reload();
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
  };

  const handleRedoSignature = async () => {
    if (!confirm('サインをやり直しますか？')) return;

    try {
      if (report.clientSignature?.imageUrl) {
        const url = report.clientSignature.imageUrl;
        const pathStart = url.indexOf('/o/') + 3;
        const pathEnd = url.indexOf('?');
        const encodedPath = url.substring(pathStart, pathEnd);
        const storagePath = decodeURIComponent(encodedPath);
        const storageRef = ref(storage, storagePath);
        try {
          await deleteStorageObject(storageRef);
        } catch (e) {
          console.warn('署名画像の削除に失敗:', e);
        }
      }

      await updateDoc(doc(db, 'companies', companyId, 'dailyReports', id), {
        'clientSignature.imageUrl': null,
        'clientSignature.signedAt': null,
        'clientSignature.signerName': null,
        status: 'draft',
        updatedAt: serverTimestamp(),
      });

      window.location.reload();
    } catch (err) {
      console.error('サインやり直しエラー:', err);
      alert('エラーが発生しました');
    }
  };

  const handleSubmit = async () => {
    if (!confirm('この日報を送信しますか？')) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'companies', companyId, 'dailyReports', id), {
        status: 'submitted',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate('/');
    } catch (err) {
      console.error('送信エラー:', err);
      alert('送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveLater = () => {
    navigate('/');
  };

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

  const isSigned = report.status === 'signed';
  const canEdit = (report.status === 'draft' || report.status === 'rejected') && !serviceRestricted;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {canEdit ? '日報編集' : serviceRestricted ? '日報（閲覧のみ）' : 'サイン済み日報'}
          </h2>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            戻る
          </button>
        </div>

        {/* サービス制限警告 */}
        {serviceRestricted && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="font-medium text-red-800">
              {getBillingStatus() === 'expired' ? 'トライアル期間が終了しました' : 'サービスが停止されています'}
            </p>
            <p className="text-sm text-red-700 mt-1">
              日報の編集・送信ができません。管理者にお問い合わせください。
            </p>
          </div>
        )}

        {report.status === 'rejected' && report.rejection?.reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <h3 className="font-medium text-red-800">差戻し理由</h3>
            <p className="text-sm text-red-700 mt-1">{report.rejection.reason}</p>
            {report.rejection.rejectedByName && (
              <p className="text-xs text-red-500 mt-1">
                差戻し者: {report.rejection.rejectedByName}
              </p>
            )}
          </div>
        )}

        {isSigned && report.clientSignature?.imageUrl && (
          <div className="mb-6">
            <SignatureDisplay
              imageUrl={report.clientSignature.imageUrl}
              signedAt={report.clientSignature.signedAt}
              signerName={report.clientSignature.signerName}
              onRedo={serviceRestricted ? null : handleRedoSignature}
            />

            {!serviceRestricted && (
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-blue-800 font-medium mb-4">
                  この日報を送信しますか？
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveLater}
                    className="flex-1 py-3 border border-gray-300 bg-white rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    あとで送信する
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? '送信中...' : '送信する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <ReportForm
            initialData={report}
            reportId={id}
            onSignatureRequest={handleSignatureRequest}
          />
        )}

        {!canEdit && !isSigned && (
          <div className="text-center py-8">
            <p className="text-gray-500">この日報は編集できません</p>
            <button
              onClick={() => navigate(`/reports/${id}`)}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              詳細を見る
            </button>
          </div>
        )}
      </main>

      {showSignatureModal && (
        <SignatureModal
          reportId={id}
          siteName={report.siteName}
          reportDate={report.reportDate}
          onComplete={handleSignatureComplete}
          onCancel={handleSignatureCancel}
        />
      )}
    </div>
  );
}
