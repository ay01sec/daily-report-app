import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateWithDay } from '../../utils/dateUtils';

export default function SignatureModal({
  reportId,
  siteName,
  reportDate,
  onComplete,
  onCancel,
}) {
  const sigCanvas = useRef(null);
  const [saving, setSaving] = useState(false);
  const { companyId } = useAuth();

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleComplete = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('サインを入力してください');
      return;
    }

    setSaving(true);
    try {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      const blob = await fetch(dataUrl).then((res) => res.blob());

      const timestamp = Date.now();
      // 統一パス形式: companies/{companyId}/dailyReports/{reportId}/signatures/{timestamp}.png
      const storagePath = `companies/${companyId}/dailyReports/${reportId}/signatures/${timestamp}.png`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'companies', companyId, 'dailyReports', reportId), {
        'clientSignature.imageUrl': downloadUrl,
        'clientSignature.signedAt': Timestamp.now(),
        'clientSignature.signerName': null,
        status: 'signed',
        updatedAt: serverTimestamp(),
      });

      onComplete();
    } catch (err) {
      console.error('サイン保存エラー:', err);
      alert('サインの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      if (!confirm('サインを中断しますか？')) {
        return;
      }
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">元請確認サイン</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>現場名: {siteName}</p>
            <p>実施日: {formatDateWithDay(reportDate)}</p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-48',
                style: { touchAction: 'none' },
              }}
              penColor="black"
              minWidth={2}
              maxWidth={2.5}
              backgroundColor="white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              クリア
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : 'サイン完了'}
            </button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>※ デバイスを元請担当者にお渡しください</p>
            <p>※ サイン後「サイン完了」を押してください</p>
          </div>
        </div>
      </div>
    </div>
  );
}
