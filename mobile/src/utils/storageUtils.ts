import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const DRAFT_PREFIX = 'draft_';
const PENDING_SYNC_KEY = 'pending_sync_reports';
const LOCAL_REPORTS_KEY = 'local_reports';
const SIGNATURES_DIR = `${FileSystem.documentDirectory}signatures/`;

// ローカル署名画像の保存ディレクトリを確保
async function ensureSignatureDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(SIGNATURES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(SIGNATURES_DIR, { intermediates: true });
  }
}

// 署名画像をローカルに保存
export async function saveSignatureLocally(
  localReportId: string,
  signatureBase64: string
): Promise<string> {
  await ensureSignatureDir();
  const fileName = `${localReportId}_${Date.now()}.png`;
  const filePath = `${SIGNATURES_DIR}${fileName}`;

  // data:image/png;base64, プレフィックスを除去
  const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
  await FileSystem.writeAsStringAsync(filePath, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return filePath;
}

// ローカル署名画像を読み込み（Base64で返す）
export async function loadSignatureLocally(filePath: string): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) return null;

    const base64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('署名画像読み込みエラー:', error);
    return null;
  }
}

// ローカル署名画像を削除
export async function deleteSignatureLocally(filePath: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
    }
    return true;
  } catch (error) {
    console.error('署名画像削除エラー:', error);
    return false;
  }
}

// ローカル日報を保存（オフライン用）
export interface LocalReport {
  localId: string;
  companyId: string;
  firebaseId?: string; // Firebaseに保存済みの場合のID
  formData: any;
  status: 'draft' | 'signed' | 'pending_upload';
  signatureLocalPath?: string;
  signatureFirebaseUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveLocalReport(report: LocalReport): Promise<string> {
  try {
    const reports = await getLocalReports();
    const existingIndex = reports.findIndex(r => r.localId === report.localId);

    if (existingIndex >= 0) {
      reports[existingIndex] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      reports.push({ ...report, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    await AsyncStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
    return report.localId;
  } catch (error) {
    console.error('ローカル日報保存エラー:', error);
    throw error;
  }
}

export async function getLocalReports(): Promise<LocalReport[]> {
  try {
    const data = await AsyncStorage.getItem(LOCAL_REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('ローカル日報取得エラー:', error);
    return [];
  }
}

export async function getLocalReport(localId: string): Promise<LocalReport | null> {
  try {
    const reports = await getLocalReports();
    return reports.find(r => r.localId === localId) || null;
  } catch (error) {
    console.error('ローカル日報取得エラー:', error);
    return null;
  }
}

export async function deleteLocalReport(localId: string): Promise<boolean> {
  try {
    const reports = await getLocalReports();
    const report = reports.find(r => r.localId === localId);

    // 署名画像も削除
    if (report?.signatureLocalPath) {
      await deleteSignatureLocally(report.signatureLocalPath);
    }

    const updated = reports.filter(r => r.localId !== localId);
    await AsyncStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('ローカル日報削除エラー:', error);
    return false;
  }
}

// 同期待ちのローカル日報を取得（送信待ち）
export async function getPendingUploadReports(): Promise<LocalReport[]> {
  const reports = await getLocalReports();
  return reports.filter(r => r.status === 'signed' && !r.signatureFirebaseUrl);
}

export async function saveDraft(reportId: string, data: any): Promise<string | null> {
  try {
    const key = reportId ? `${DRAFT_PREFIX}${reportId}` : `${DRAFT_PREFIX}new_${Date.now()}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
    return key;
  } catch (error) {
    console.error('下書き保存エラー:', error);
    return null;
  }
}

export async function getDraft(reportId: string): Promise<any | null> {
  try {
    const key = `${DRAFT_PREFIX}${reportId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('下書き読み込みエラー:', error);
    return null;
  }
}

export async function getAllDrafts(): Promise<any[]> {
  const drafts: any[] = [];
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter(key => key.startsWith(DRAFT_PREFIX));

    for (const key of draftKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        drafts.push({
          key,
          reportId: key.replace(DRAFT_PREFIX, ''),
          ...JSON.parse(data),
        });
      }
    }
  } catch (error) {
    console.error('下書き一覧取得エラー:', error);
  }
  return drafts;
}

export async function deleteDraft(reportId: string): Promise<boolean> {
  try {
    const key = `${DRAFT_PREFIX}${reportId}`;
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('下書き削除エラー:', error);
    return false;
  }
}

export async function deleteDraftByKey(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('下書き削除エラー:', error);
    return false;
  }
}

export async function addPendingSync(reportData: any): Promise<string | null> {
  try {
    const pending = await getPendingSyncs();
    const id = `pending_${Date.now()}`;
    pending.push({
      id,
      ...reportData,
      pendingSince: new Date().toISOString(),
    });
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    return id;
  } catch (error) {
    console.error('同期待ち追加エラー:', error);
    return null;
  }
}

export async function getPendingSyncs(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('同期待ち取得エラー:', error);
    return [];
  }
}

export async function removePendingSync(id: string): Promise<boolean> {
  try {
    const pending = await getPendingSyncs();
    const updated = pending.filter((item: any) => item.id !== id);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('同期待ち削除エラー:', error);
    return false;
  }
}

export async function clearPendingSyncs(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    return true;
  } catch (error) {
    console.error('同期待ちクリアエラー:', error);
    return false;
  }
}
