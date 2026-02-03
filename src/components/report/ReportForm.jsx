import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSites } from '../../hooks/useSites';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import WorkerRow from './WorkerRow';
import PhotoUploader from './PhotoUploader';
import SignatureDisplay from './SignatureDisplay';
import LoadingSpinner from '../common/LoadingSpinner';
import { getTodayString, fromDateInputValue } from '../../utils/dateUtils';
import { validateReport } from '../../utils/validationUtils';

const emptyWorker = {
  employeeId: '',
  name: '',
  startTime: '08:00',
  endTime: '17:00',
  noLunchBreak: false,
  remarks: '',
};

export default function ReportForm({
  initialData = null,
  reportId = null,
  onSignatureRequest,
}) {
  const navigate = useNavigate();
  const { currentUser, userInfo, companyId, companyInfo } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();
  const { sites, loading: sitesLoading } = useSites();
  const { online, saveOffline, loadOffline, clearOffline, queueForSync } = useOfflineStorage();

  const [formData, setFormData] = useState({
    reportDate: getTodayString(),
    siteId: '',
    siteName: '',
    weather: '',
    workers: [{ ...emptyWorker }],
    notes: '',
    photos: [],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      // ローカルタイムゾーンで日付を取得（UTC変換による日付ずれを防止）
      let reportDate;
      if (initialData.reportDate?.toDate) {
        const date = initialData.reportDate.toDate();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        reportDate = `${year}-${month}-${day}`;
      } else {
        reportDate = initialData.reportDate || getTodayString();
      }

      setFormData({
        reportDate,
        siteId: initialData.siteId || '',
        siteName: initialData.siteName || '',
        weather: initialData.weather || '',
        workers:
          initialData.workers?.length > 0
            ? initialData.workers
            : [{ ...emptyWorker }],
        notes: initialData.notes || '',
        photos: initialData.photos || [],
      });
    } else if (!reportId) {
      const localDraft = loadOffline('new');
      if (localDraft && localDraft.formData) {
        setFormData(localDraft.formData);
      }
    }
  }, [initialData, reportId, loadOffline]);

  // 新規作成時にログインユーザーを作業員1行目に自動セット
  useEffect(() => {
    if (initialData || reportId || !currentUser || employees.length === 0) return;

    // 既にセット済みなら何もしない
    if (formData.workers[0]?.employeeId) return;

    // メールアドレスで従業員マッチング
    const matched = employees.find(
      (emp) => emp.contact?.email && emp.contact.email === currentUser.email
    );

    setFormData((prev) => {
      const newWorkers = [...prev.workers];
      if (matched) {
        newWorkers[0] = {
          ...newWorkers[0],
          employeeId: matched.id,
          name: matched.fullName,
        };
      } else {
        // マッチしなくてもログインユーザーの氏名を固定セット
        newWorkers[0] = {
          ...newWorkers[0],
          employeeId: '__self__',
          name: userInfo?.displayName || currentUser.email || '',
        };
      }
      return { ...prev, workers: newWorkers };
    });
  }, [initialData, reportId, currentUser, userInfo, employees, formData.workers]);

  useEffect(() => {
    if (!reportId && !initialData) {
      const timeoutId = setTimeout(() => {
        saveOffline('new', { formData });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, reportId, initialData, saveOffline]);

  const handleSiteChange = (e) => {
    const selectedSite = sites.find((s) => s.id === e.target.value);
    setFormData((prev) => ({
      ...prev,
      siteId: e.target.value,
      siteName: selectedSite?.siteName || '',
    }));
  };

  const handleWorkerChange = (index, updatedWorker) => {
    setFormData((prev) => {
      const newWorkers = [...prev.workers];
      newWorkers[index] = updatedWorker;
      return { ...prev, workers: newWorkers };
    });
  };

  const handleAddWorker = () => {
    setFormData((prev) => ({
      ...prev,
      workers: [...prev.workers, { ...emptyWorker }],
    }));
  };

  const handleRemoveWorker = (index) => {
    setFormData((prev) => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index),
    }));
  };

  const buildReportData = (forOffline = false, isUpdate = false) => {
    const reportDate = fromDateInputValue(formData.reportDate);

    const data = {
      companyId,
      siteId: formData.siteId,
      siteName: formData.siteName,
      reportDate: forOffline ? reportDate.toISOString() : Timestamp.fromDate(reportDate),
      createdBy: currentUser.uid,
      createdByName: userInfo?.displayName || userInfo?.email || '',
      workers: formData.workers.map((w) => ({
        employeeId: w.employeeId,
        name: w.name,
        startTime: w.startTime,
        endTime: w.endTime,
        noLunchBreak: w.noLunchBreak || false,
        remarks: w.remarks || '',
      })),
      notes: formData.notes || '',
      weather: formData.weather || '',
      photos: formData.photos || [],
    };

    // 新規作成時のみ初期値を設定（更新時はリセットしない）
    if (!isUpdate) {
      data.status = 'draft';
      data.submittedAt = null;
      data.clientSignature = {
        imageUrl: null,
        signedAt: null,
        signerName: null,
      };
      data.approval = {
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
      };
    }

    if (!forOffline) {
      data.updatedAt = serverTimestamp();
    }

    return data;
  };

  const handleSaveDraft = async () => {
    const validation = validateReport(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      if (!online) {
        const data = buildReportData(true, !!reportId);
        queueForSync(data);
        clearOffline('new');
        alert('オフラインのため、ローカルに保存しました。オンライン復帰時に同期されます。');
        navigate('/');
        return;
      }

      const data = buildReportData(false, !!reportId);

      if (reportId) {
        await updateDoc(doc(db, 'companies', companyId, 'dailyReports', reportId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'companies', companyId, 'dailyReports'), data);
        clearOffline('new');
      }

      navigate('/');
    } catch (err) {
      console.error('保存エラー:', err);
      if (!online) {
        const data = buildReportData(true, !!reportId);
        queueForSync(data);
        clearOffline('new');
        alert('保存に失敗しました。ローカルに保存しました。');
        navigate('/');
      } else {
        alert('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToSign = async () => {
    const validation = validateReport(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!online) {
      alert('サイン機能を使用するにはオンライン接続が必要です');
      return;
    }

    setSaving(true);
    try {
      const data = buildReportData(false, !!reportId);
      let newReportId = reportId;

      if (reportId) {
        await updateDoc(doc(db, 'companies', companyId, 'dailyReports', reportId), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        data.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'companies', companyId, 'dailyReports'), data);
        newReportId = docRef.id;
        clearOffline('new');
      }

      if (onSignatureRequest) {
        onSignatureRequest(newReportId, formData);
      }
    } catch (err) {
      console.error('保存エラー:', err);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (employeesLoading || sitesLoading) {
    return <LoadingSpinner className="py-12" />;
  }

  const canEdit = !initialData || initialData.status === 'draft' || initialData.status === 'rejected';

  return (
    <div className="space-y-6">
      {!online && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          オフラインモードです。下書き保存はローカルに保存されます。
        </div>
      )}

      {initialData?.clientSignature?.imageUrl && (
        <SignatureDisplay
          imageUrl={initialData.clientSignature.imageUrl}
          signedAt={initialData.clientSignature.signedAt}
          signerName={initialData.clientSignature.signerName}
        />
      )}

      {!initialData?.clientSignature?.imageUrl && (
        <div className="bg-gray-100 rounded-lg p-4 border-2 border-dashed border-gray-300">
          <p className="text-center text-gray-500 text-sm">元請確認欄: 未署名</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">会社名</span>
            <p className="font-medium">{companyInfo?.companyName || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">作成者</span>
            <p className="font-medium">
              {userInfo?.displayName || userInfo?.email || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            実施日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.reportDate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
            }
            disabled={!canEdit}
            className={`w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.reportDate ? 'border-red-500' : 'border-gray-300'
            } disabled:bg-gray-100`}
          />
          {errors.reportDate && (
            <p className="text-red-500 text-xs mt-1">{errors.reportDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            天候
          </label>
          <div className="flex gap-2">
            {[
              { value: 'sunny', label: '晴れ', icon: '☀️' },
              { value: 'cloudy', label: '曇り', icon: '☁️' },
              { value: 'rainy', label: '雨', icon: '🌧️' },
              { value: 'snowy', label: '雪', icon: '❄️' },
            ].map((w) => (
              <button
                key={w.value}
                type="button"
                disabled={!canEdit}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    weather: prev.weather === w.value ? '' : w.value,
                  }))
                }
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
                  formData.weather === w.value
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <span className="block text-lg">{w.icon}</span>
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            現場名 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.siteId}
            onChange={handleSiteChange}
            disabled={!canEdit}
            className={`w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.siteId ? 'border-red-500' : 'border-gray-300'
            } disabled:bg-gray-100`}
          >
            <option value="">選択してください</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.siteName}
              </option>
            ))}
          </select>
          {errors.siteId && (
            <p className="text-red-500 text-xs mt-1">{errors.siteId}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <h3 className="font-medium text-gray-900">作業員</h3>
        {errors.workers && (
          <p className="text-red-500 text-sm">{errors.workers}</p>
        )}

        <div className="space-y-4">
          {formData.workers.map((worker, index) => (
            <WorkerRow
              key={index}
              worker={worker}
              index={index}
              employees={employees}
              onChange={handleWorkerChange}
              onRemove={handleRemoveWorker}
              errors={errors.workerErrors?.[index]}
              canRemove={formData.workers.length > 1 && canEdit}
              isNameLocked={index === 0 && !initialData && !reportId}
            />
          ))}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleAddWorker}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            + 作業員を追加
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          連絡事項
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          disabled={!canEdit}
          rows={3}
          placeholder="連絡事項があれば入力してください"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          写真（最大3枚）
        </label>
        <PhotoUploader
          reportId={reportId}
          photos={formData.photos}
          onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
          disabled={!canEdit}
        />
      </div>

      {canEdit && (
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '下書き保存'}
          </button>
          <button
            type="button"
            onClick={handleProceedToSign}
            disabled={saving || !online}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            元請サインへ進む
          </button>
        </div>
      )}
    </div>
  );
}
