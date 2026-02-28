import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useSites } from '../../hooks/useSites';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';
import WorkerRow from './WorkerRow';
import PhotoUploader from './PhotoUploader';
import SignatureDisplay from './SignatureDisplay';
import LoadingSpinner from '../common/LoadingSpinner';
import ModalPicker from '../common/ModalPicker';
import { getTodayString, fromDateInputValue, formatDate } from '../../utils/dateUtils';
import { validateReport } from '../../utils/validationUtils';
import { saveLocalReport, getLocalReport, LocalReport, LocalPhoto } from '../../utils/storageUtils';

interface Worker {
  employeeId?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  noLunchBreak?: boolean;
  remarks?: string;
}

interface Photo {
  url: string;
  path?: string;
  name?: string;
}

interface FormData {
  reportDate: string;
  siteId: string;
  siteName: string;
  weather: string;
  workers: Worker[];
  notes: string;
  photos: Photo[];
}

const emptyWorker: Worker = {
  employeeId: '',
  name: '',
  startTime: '08:00',
  endTime: '17:00',
  noLunchBreak: false,
  remarks: '',
};

interface ReportFormProps {
  initialData?: any;
  reportId?: string | null;
  localReportId?: string | null;
  onSignatureRequest: (reportId: string | null, formData: FormData, localReportId: string) => void;
  onSaved?: () => void;
}

export default function ReportForm({
  initialData = null,
  reportId = null,
  localReportId: initialLocalReportId = null,
  onSignatureRequest,
  onSaved,
}: ReportFormProps) {
  const { currentUser, userInfo, companyId, companyInfo } = useAuth();
  const { employees, loading: employeesLoading } = useEmployees();
  const { sites, loading: sitesLoading, debugInfo: sitesDebugInfo } = useSites();
  const [showSitesDebug, setShowSitesDebug] = useState(false);
  const { online, saveOffline, loadOffline, clearOffline, queueForSync } = useOfflineStorage();

  // ローカル保存用のIDを管理
  const [localReportId] = useState(() => initialLocalReportId || `local_${Date.now()}`);

  // ログインユーザーの表示名を取得
  const loggedInUserName = useMemo(() => {
    return userInfo?.displayName || currentUser?.email || '';
  }, [userInfo?.displayName, currentUser?.email]);

  // ログインユーザーに対応する従業員IDを取得
  const loggedInEmployeeId = useMemo(() => {
    if (!currentUser || employees.length === 0) return '__self__';
    const matched = employees.find(
      (emp) => emp.contact?.email && emp.contact.email === currentUser.email
    );
    return matched?.id || '__self__';
  }, [currentUser, employees]);

  const [formData, setFormData] = useState<FormData>({
    reportDate: getTodayString(),
    siteId: '',
    siteName: '',
    weather: '',
    workers: [{
      ...emptyWorker,
      employeeId: '__self__',
      name: loggedInUserName,
    }],
    notes: '',
    photos: [],
  });
  const [errors, setErrors] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<LocalPhoto[]>([]);

  // 初期データまたはオフラインデータの読み込み
  useEffect(() => {
    const loadData = async () => {
      if (initialData) {
        // Firebase から取得したデータを読み込み
        let reportDate: string;
        if (initialData.reportDate?.toDate) {
          const date = initialData.reportDate.toDate();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          reportDate = `${year}-${month}-${day}`;
        } else {
          reportDate = initialData.reportDate || getTodayString();
        }

        // 作業員データを読み込み（1人目の氏名はログインユーザーで上書き）
        let workers = initialData.workers?.length > 0
          ? [...initialData.workers]
          : [{ ...emptyWorker }];

        // 1人目は常にログインユーザー
        workers[0] = {
          ...workers[0],
          employeeId: loggedInEmployeeId,
          name: loggedInUserName,
        };

        setFormData({
          reportDate,
          siteId: initialData.siteId || '',
          siteName: initialData.siteName || '',
          weather: initialData.weather || '',
          workers,
          notes: initialData.notes || '',
          photos: initialData.photos || [],
        });
      } else if (initialLocalReportId) {
        // ローカルストレージから保存済みの日報を読み込み
        console.log('[ReportForm] ローカルレポートを読み込み中:', initialLocalReportId);
        const localReport = await getLocalReport(initialLocalReportId);
        if (localReport && localReport.formData) {
          console.log('[ReportForm] ローカルレポート読み込み完了:', {
            status: localReport.status,
            hasPhotos: localReport.formData.photos?.length || 0,
            hasLocalPhotos: localReport.localPhotos?.length || 0,
          });

          const loadedData = localReport.formData;
          // 1人目は常にログインユーザーで上書き
          if (loadedData.workers && loadedData.workers.length > 0) {
            loadedData.workers[0] = {
              ...loadedData.workers[0],
              employeeId: loggedInEmployeeId,
              name: loggedInUserName,
            };
          }

          setFormData({
            reportDate: loadedData.reportDate || getTodayString(),
            siteId: loadedData.siteId || '',
            siteName: loadedData.siteName || '',
            weather: loadedData.weather || '',
            workers: loadedData.workers || [{ ...emptyWorker, employeeId: loggedInEmployeeId, name: loggedInUserName }],
            notes: loadedData.notes || '',
            photos: loadedData.photos || [],
          });

          // ローカル写真情報も復元
          if (localReport.localPhotos && localReport.localPhotos.length > 0) {
            setLocalPhotos(localReport.localPhotos);
          }
        } else {
          console.log('[ReportForm] ローカルレポートが見つかりません');
        }
      } else if (!reportId) {
        // 新規作成時はオフラインデータを確認
        const localDraft = await loadOffline('new');
        if (localDraft && localDraft.formData) {
          const loadedData = localDraft.formData;
          // 1人目は常にログインユーザーで上書き
          if (loadedData.workers && loadedData.workers.length > 0) {
            loadedData.workers[0] = {
              ...loadedData.workers[0],
              employeeId: loggedInEmployeeId,
              name: loggedInUserName,
            };
          }
          setFormData(loadedData);
        } else {
          // 新規作成：1人目をログインユーザーで初期化
          setFormData((prev) => ({
            ...prev,
            workers: [{
              ...emptyWorker,
              employeeId: loggedInEmployeeId,
              name: loggedInUserName,
            }],
          }));
        }
      }
    };

    loadData();
  }, [initialData, reportId, initialLocalReportId, loggedInUserName, loggedInEmployeeId]);

  // ログインユーザー名が変わったら1人目の作業員名を更新
  useEffect(() => {
    if (loggedInUserName) {
      setFormData((prev) => {
        if (prev.workers.length > 0 && prev.workers[0].name !== loggedInUserName) {
          const newWorkers = [...prev.workers];
          newWorkers[0] = {
            ...newWorkers[0],
            employeeId: loggedInEmployeeId,
            name: loggedInUserName,
          };
          return { ...prev, workers: newWorkers };
        }
        return prev;
      });
    }
  }, [loggedInUserName, loggedInEmployeeId]);

  // オフライン保存
  useEffect(() => {
    if (!reportId && !initialData) {
      const timeoutId = setTimeout(() => {
        saveOffline('new', { formData });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, reportId, initialData]);

  const handleSiteChange = (value: string) => {
    const selectedSite = sites.find((s) => s.id === value);
    setFormData((prev) => ({
      ...prev,
      siteId: value,
      siteName: selectedSite?.siteName || '',
    }));
  };

  const handleWorkerChange = (index: number, updatedWorker: Worker) => {
    // 1人目の作業員の氏名は変更不可
    if (index === 0) {
      updatedWorker = {
        ...updatedWorker,
        employeeId: loggedInEmployeeId,
        name: loggedInUserName,
      };
    }
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

  const handleRemoveWorker = (index: number) => {
    // 1人目は削除不可
    if (index === 0) return;
    setFormData((prev) => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index),
    }));
  };

  const buildReportData = (forOffline: boolean = false, isUpdate: boolean = false) => {
    const reportDate = fromDateInputValue(formData.reportDate);

    const data: any = {
      companyId,
      siteId: formData.siteId,
      siteName: formData.siteName,
      reportDate: forOffline ? reportDate?.toISOString() : firestore.Timestamp.fromDate(reportDate!),
      createdBy: currentUser!.uid,
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
      data.updatedAt = firestore.FieldValue.serverTimestamp();
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
      // オフライン同期用にFirebaseに必要なフィールドを含めたデータを作成
      const fullFormData = {
        ...formData,
        companyId: companyId!,
        createdBy: currentUser!.uid,
        createdByName: userInfo?.displayName || userInfo?.email || '',
        workers: formData.workers.map((w) => ({
          employeeId: w.employeeId,
          name: w.name,
          startTime: w.startTime,
          endTime: w.endTime,
          noLunchBreak: w.noLunchBreak || false,
          remarks: w.remarks || '',
        })),
      };

      // 常にローカルに保存
      console.log(`[handleSaveDraft] localReportId=${localReportId}, localPhotos.length=${localPhotos.length}`);
      localPhotos.forEach((lp, i) => {
        console.log(`[handleSaveDraft]   localPhoto[${i}]: path=${lp.localPath}, fileName=${lp.fileName}`);
      });

      const localReport: LocalReport = {
        localId: localReportId,
        companyId: companyId!,
        firebaseId: reportId || undefined,
        formData: fullFormData,
        status: 'draft',
        localPhotos: localPhotos.length > 0 ? localPhotos : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveLocalReport(localReport);

      if (online) {
        // オンライン：Firebaseにも保存
        try {
          const data = buildReportData(false, !!reportId);

          if (reportId) {
            await firestore()
              .collection('companies')
              .doc(companyId!)
              .collection('dailyReports')
              .doc(reportId)
              .update({
                ...data,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
          } else {
            data.createdAt = firestore.FieldValue.serverTimestamp();
            const docRef = await firestore()
              .collection('companies')
              .doc(companyId!)
              .collection('dailyReports')
              .add(data);
            // ローカル日報にFirebase IDを紐付け
            localReport.firebaseId = docRef.id;
            await saveLocalReport(localReport);
          }
          await clearOffline('new');
          try {
            onSaved?.();
          } catch (navErr) {
            console.warn('onSaved callback error:', navErr);
          }
        } catch (firebaseErr) {
          console.error('Firebase保存エラー:', firebaseErr);
          Alert.alert('保存完了', 'ローカルに保存しました。ネットワークエラーのため、Firebase保存は後で同期されます。');
          try {
            onSaved?.();
          } catch (navErr) {
            console.warn('onSaved callback error:', navErr);
          }
        }
      } else {
        // オフライン：ローカルのみ
        await clearOffline('new');
        Alert.alert('保存完了', 'オフラインのため、ローカルに保存しました。');
        try {
          onSaved?.();
        } catch (navErr) {
          console.warn('onSaved callback error:', navErr);
        }
      }
    } catch (err) {
      console.error('保存エラー:', err);
      Alert.alert('エラー', '保存に失敗しました');
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

    setSaving(true);
    try {
      // オフライン同期用にFirebaseに必要なフィールドを含めたデータを作成
      const fullFormData = {
        ...formData,
        companyId: companyId!,
        createdBy: currentUser!.uid,
        createdByName: userInfo?.displayName || userInfo?.email || '',
        workers: formData.workers.map((w) => ({
          employeeId: w.employeeId,
          name: w.name,
          startTime: w.startTime,
          endTime: w.endTime,
          noLunchBreak: w.noLunchBreak || false,
          remarks: w.remarks || '',
        })),
      };

      // 常にローカルに保存
      console.log(`[handleProceedToSign] localReportId=${localReportId}, localPhotos.length=${localPhotos.length}`);
      localPhotos.forEach((lp, i) => {
        console.log(`[handleProceedToSign]   localPhoto[${i}]: path=${lp.localPath}, fileName=${lp.fileName}`);
      });

      const localReport: LocalReport = {
        localId: localReportId,
        companyId: companyId!,
        firebaseId: reportId || undefined,
        formData: fullFormData,
        status: 'draft',
        localPhotos: localPhotos.length > 0 ? localPhotos : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveLocalReport(localReport);

      let newReportId = reportId;

      if (online) {
        // オンライン：Firebaseにも保存してからサイン画面へ
        try {
          const data = buildReportData(false, !!reportId);

          if (reportId) {
            await firestore()
              .collection('companies')
              .doc(companyId!)
              .collection('dailyReports')
              .doc(reportId)
              .update({
                ...data,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
          } else {
            data.createdAt = firestore.FieldValue.serverTimestamp();
            const docRef = await firestore()
              .collection('companies')
              .doc(companyId!)
              .collection('dailyReports')
              .add(data);
            newReportId = docRef.id;
            // ローカル日報にFirebase IDを紐付け
            localReport.firebaseId = newReportId;
            await saveLocalReport(localReport);
            await clearOffline('new');
          }
        } catch (firebaseErr) {
          console.error('Firebase保存エラー:', firebaseErr);
          // Firebase保存に失敗してもサイン画面へ進む（オフラインモード）
        }
      }

      // サイン画面へ（オンライン/オフライン両対応）
      onSignatureRequest(newReportId, fullFormData, localReportId);
    } catch (err) {
      console.error('保存エラー:', err);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setFormData((prev) => ({ ...prev, reportDate: `${year}-${month}-${day}` }));
    }
  };

  if (employeesLoading || sitesLoading) {
    return <LoadingSpinner />;
  }

  const canEdit = !initialData || initialData.status === 'draft' || initialData.status === 'rejected';
  const currentDate = formData.reportDate ? new Date(formData.reportDate) : new Date();

  const weatherOptions = [
    { value: 'sunny', label: '晴れ', icon: '☀️' },
    { value: 'cloudy', label: '曇り', icon: '☁️' },
    { value: 'rainy', label: '雨', icon: '🌧️' },
    { value: 'snowy', label: '雪', icon: '❄️' },
  ];

  const siteOptions = [
    { value: '', label: '選択してください' },
    ...sites.map((site) => ({ value: site.id, label: site.siteName || '' })),
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {!online && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineText}>
              オフラインモードです。下書き保存・サインはローカルに保存され、ネットワーク接続時に自動同期されます。
            </Text>
          </View>
        )}

        {initialData?.clientSignature?.imageUrl && (
          <SignatureDisplay
            imageUrl={initialData.clientSignature.imageUrl}
            signedAt={initialData.clientSignature.signedAt}
            signerName={initialData.clientSignature.signerName}
          />
        )}

        {!initialData?.clientSignature?.imageUrl && (
          <View style={styles.emptySignature}>
            <Text style={styles.emptySignatureText}>元請確認欄: 未署名</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>会社名</Text>
              <Text style={styles.infoValue}>{companyInfo?.companyName || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>作成者</Text>
              <Text style={styles.infoValue}>
                {userInfo?.displayName || userInfo?.email || '-'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>
              実施日 <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dateInput, errors.reportDate && styles.errorBorder]}
              onPress={() => canEdit && setShowDatePicker(true)}
              disabled={!canEdit}
            >
              <Text style={styles.dateText}>{formatDate(currentDate, 'yyyy年M月d日')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
            {errors.reportDate && (
              <Text style={styles.errorText}>{errors.reportDate}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>天候</Text>
            <View style={styles.weatherRow}>
              {weatherOptions.map((w) => (
                <TouchableOpacity
                  key={w.value}
                  style={[
                    styles.weatherButton,
                    formData.weather === w.value && styles.weatherButtonActive,
                  ]}
                  onPress={() =>
                    canEdit && setFormData((prev) => ({
                      ...prev,
                      weather: prev.weather === w.value ? '' : w.value,
                    }))
                  }
                  disabled={!canEdit}
                >
                  <Text style={styles.weatherIcon}>{w.icon}</Text>
                  <Text
                    style={[
                      styles.weatherLabel,
                      formData.weather === w.value && styles.weatherLabelActive,
                    ]}
                  >
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                現場名 <Text style={styles.required}>*</Text>
              </Text>
              {/* デバッグ表示（本番では非表示）
              <TouchableOpacity onPress={() => setShowSitesDebug(!showSitesDebug)}>
                <Text style={styles.debugToggle}>
                  {showSitesDebug ? 'デバッグ非表示' : 'デバッグ表示'}
                </Text>
              </TouchableOpacity>
              */}
            </View>
            {/* デバッグ情報（本番では非表示）
            {showSitesDebug && sitesDebugInfo && (
              <View style={styles.sitesDebugContainer}>
                <Text style={styles.sitesDebugText} selectable>{sitesDebugInfo}</Text>
              </View>
            )}
            */}
            <ModalPicker
              selectedValue={formData.siteId}
              onValueChange={handleSiteChange}
              options={siteOptions}
              placeholder="選択してください"
              disabled={!canEdit}
              error={!!errors.siteId}
            />
            {errors.siteId && (
              <Text style={styles.errorText}>{errors.siteId}</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>作業員</Text>
          {errors.workers && (
            <Text style={styles.errorText}>{errors.workers}</Text>
          )}

          <View style={styles.workersContainer}>
            {formData.workers.map((worker, index) => (
              <WorkerRow
                key={index}
                worker={worker}
                index={index}
                employees={employees}
                onChange={handleWorkerChange}
                onRemove={handleRemoveWorker}
                errors={errors.workerErrors?.[index]}
                canRemove={index !== 0 && formData.workers.length > 1 && canEdit}
                isNameLocked={index === 0}
                canEdit={canEdit}
              />
            ))}
          </View>

          {canEdit && (
            <TouchableOpacity style={styles.addWorkerButton} onPress={handleAddWorker}>
              <Text style={styles.addWorkerButtonText}>+ 作業員を追加</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>連絡事項</Text>
          <TextInput
            style={styles.textArea}
            value={formData.notes}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
            editable={canEdit}
            multiline
            numberOfLines={3}
            placeholder="連絡事項があれば入力してください"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>写真（最大3枚）</Text>
          <PhotoUploader
            reportId={reportId}
            photos={formData.photos}
            onChange={(photos, newLocalPhotos) => {
              console.log(`[ReportForm] 写真変更: photos=${photos.length}, newLocalPhotos=${newLocalPhotos?.length || 0}`);
              if (newLocalPhotos) {
                newLocalPhotos.forEach((lp, i) => {
                  console.log(`[ReportForm]   localPhoto[${i}]: ${lp.localPath}`);
                });
              }
              setFormData((prev) => ({ ...prev, photos }));
              if (newLocalPhotos) {
                setLocalPhotos(newLocalPhotos);
              }
            }}
            disabled={!canEdit}
            localPhotos={localPhotos}
          />
        </View>

        {canEdit && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.draftButton]}
              onPress={handleSaveDraft}
              disabled={saving}
            >
              <Text style={styles.draftButtonText}>
                {saving ? '保存中...' : '下書き保存'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.signButton, saving && styles.buttonDisabled]}
              onPress={handleProceedToSign}
              disabled={saving}
            >
              <Text style={styles.signButtonText}>元請サインへ進む</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offlineText: {
    fontSize: 14,
    color: '#92400e',
  },
  emptySignature: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    marginBottom: 16,
  },
  emptySignatureText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  debugToggle: {
    fontSize: 12,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  sitesDebugContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  sitesDebugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#166534',
  },
  required: {
    color: '#ef4444',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  weatherRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weatherButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  weatherButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  weatherIcon: {
    fontSize: 20,
  },
  weatherLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  weatherLabelActive: {
    color: '#1d4ed8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  workersContainer: {
    gap: 16,
  },
  addWorkerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  addWorkerButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  draftButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  draftButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  signButton: {
    backgroundColor: '#2563eb',
  },
  signButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorBorder: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});
