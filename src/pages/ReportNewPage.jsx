import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import ReportForm from '../components/report/ReportForm';
import SignatureModal from '../components/report/SignatureModal';
import { useAuth } from '../contexts/AuthContext';

export default function ReportNewPage() {
  const navigate = useNavigate();
  const { isServiceRestricted } = useAuth();

  // サービス制限時はホームにリダイレクト
  useEffect(() => {
    if (isServiceRestricted()) {
      navigate('/', { replace: true });
    }
  }, [isServiceRestricted, navigate]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [currentFormData, setCurrentFormData] = useState(null);

  const handleSignatureRequest = (reportId, formData) => {
    setCurrentReportId(reportId);
    setCurrentFormData(formData);
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = () => {
    setShowSignatureModal(false);
    navigate(`/reports/${currentReportId}/edit`);
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
    if (currentReportId) {
      navigate(`/reports/${currentReportId}/edit`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">新規日報作成</h2>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            戻る
          </button>
        </div>
        <ReportForm onSignatureRequest={handleSignatureRequest} />
      </main>

      {showSignatureModal && currentReportId && (
        <SignatureModal
          reportId={currentReportId}
          siteName={currentFormData?.siteName}
          reportDate={currentFormData?.reportDate}
          onComplete={handleSignatureComplete}
          onCancel={handleSignatureCancel}
        />
      )}
    </div>
  );
}
