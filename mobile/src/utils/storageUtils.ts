import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const DRAFT_PREFIX = 'draft_';
const PENDING_SYNC_KEY = 'pending_sync_reports';
const LOCAL_REPORTS_KEY = 'local_reports';
const SIGNATURES_DIR = `${FileSystem.documentDirectory}signatures/`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const CACHE_SITES_KEY = 'cache_sites';
const CACHE_EMPLOYEES_KEY = 'cache_employees';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24時間

// ========== マスターデータキャッシュ ==========

interface CacheData<T> {
  data: T[];
  companyId: string;
  cachedAt: string;
}

// 現場データをキャッシュに保存
export async function cacheSites(companyId: string, sites: any[]): Promise<void> {
  try {
    const cacheData: CacheData<any> = {
      data: sites,
      companyId,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_SITES_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('現場キャッシュ保存エラー:', error);
  }
}

// 現場データをキャッシュから取得
export async function getCachedSites(companyId: string): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_SITES_KEY);
    if (!data) return null;

    const cacheData: CacheData<any> = JSON.parse(data);

    // 会社IDが一致するか確認
    if (cacheData.companyId !== companyId) return null;

    // キャッシュの有効期限を確認
    const cachedAt = new Date(cacheData.cachedAt).getTime();
    if (Date.now() - cachedAt > CACHE_EXPIRY_MS) {
      return null; // 期限切れ
    }

    return cacheData.data;
  } catch (error) {
    console.error('現場キャッシュ取得エラー:', error);
    return null;
  }
}

// 従業員データをキャッシュに保存
export async function cacheEmployees(companyId: string, employees: any[]): Promise<void> {
  try {
    const cacheData: CacheData<any> = {
      data: employees,
      companyId,
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHE_EMPLOYEES_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('従業員キャッシュ保存エラー:', error);
  }
}

// 従業員データをキャッシュから取得
export async function getCachedEmployees(companyId: string): Promise<any[] | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_EMPLOYEES_KEY);
    if (!data) return null;

    const cacheData: CacheData<any> = JSON.parse(data);

    // 会社IDが一致するか確認
    if (cacheData.companyId !== companyId) return null;

    // キャッシュの有効期限を確認
    const cachedAt = new Date(cacheData.cachedAt).getTime();
    if (Date.now() - cachedAt > CACHE_EXPIRY_MS) {
      return null; // 期限切れ
    }

    return cacheData.data;
  } catch (error) {
    console.error('従業員キャッシュ取得エラー:', error);
    return null;
  }
}

// キャッシュをクリア
export async function clearMasterDataCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CACHE_SITES_KEY, CACHE_EMPLOYEES_KEY]);
  } catch (error) {
    console.error('キャッシュクリアエラー:', error);
  }
}

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

// ========== 写真ローカル保存 ==========

// ローカル写真の保存ディレクトリを確保
async function ensurePhotosDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

export interface LocalPhoto {
  localPath: string;
  fileName: string;
  firebaseUrl?: string;  // Firebase Storageにアップロード済みの場合のURL
  firebasePath?: string; // Firebase Storageのパス
}

// 写真をローカルに保存（URIからコピー）
export async function savePhotoLocally(
  sourceUri: string,
  fileName: string
): Promise<LocalPhoto> {
  await ensurePhotosDir();
  const localPath = `${PHOTOS_DIR}${Date.now()}_${fileName}`;

  console.log(`[Photo] 保存開始: ${sourceUri} → ${localPath}`);

  // ソースファイルの存在確認
  const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
  if (!sourceInfo.exists) {
    console.error(`[Photo] ソースファイルが存在しません: ${sourceUri}`);
    throw new Error('写真のソースファイルが見つかりません');
  }
  console.log(`[Photo] ソースファイル確認: exists=${sourceInfo.exists}, size=${(sourceInfo as any).size || 'unknown'}`);

  // ソースURIからローカルにコピー
  await FileSystem.copyAsync({
    from: sourceUri,
    to: localPath,
  });

  // コピーが成功したか確認
  const destInfo = await FileSystem.getInfoAsync(localPath);
  if (!destInfo.exists) {
    console.error(`[Photo] コピー失敗: ファイルが作成されませんでした: ${localPath}`);
    throw new Error('写真のコピーに失敗しました');
  }
  console.log(`[Photo] 保存完了: ${localPath}, size=${(destInfo as any).size || 'unknown'}`);

  return {
    localPath,
    fileName,
  };
}

// ローカル写真を読み込み（Base64で返す）
export async function loadPhotoLocally(localPath: string): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (!fileInfo.exists) return null;

    const base64 = await FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('写真読み込みエラー:', error);
    return null;
  }
}

// ローカル写真を削除
export async function deletePhotoLocally(localPath: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localPath);
    }
    return true;
  } catch (error) {
    console.error('写真削除エラー:', error);
    return false;
  }
}

// 写真ディレクトリの状態をログ出力（デバッグ用）
export async function debugListPhotos(): Promise<string[]> {
  try {
    await ensurePhotosDir();
    const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
    console.log(`[Photo Debug] 写真ディレクトリ内のファイル (${files.length}件):`);
    files.forEach(f => console.log(`  - ${f}`));
    return files;
  } catch (error) {
    console.error('[Photo Debug] ディレクトリ読み込みエラー:', error);
    return [];
  }
}

// 特定のLocalReportの写真が存在するか確認（デバッグ用）
export async function verifyLocalReportPhotos(report: LocalReport): Promise<{
  valid: boolean;
  details: { path: string; exists: boolean }[];
}> {
  const details: { path: string; exists: boolean }[] = [];

  if (!report.localPhotos || report.localPhotos.length === 0) {
    return { valid: true, details };
  }

  for (const photo of report.localPhotos) {
    const info = await FileSystem.getInfoAsync(photo.localPath);
    details.push({
      path: photo.localPath,
      exists: info.exists,
    });
    console.log(`[Photo Verify] ${photo.localPath}: ${info.exists ? '存在' : '見つからない'}`);
  }

  const valid = details.every(d => d.exists);
  return { valid, details };
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
  localPhotos?: LocalPhoto[];  // オフライン保存された写真
  createdAt: string;
  updatedAt: string;
}

export async function saveLocalReport(report: LocalReport): Promise<string> {
  try {
    console.log(`[LocalReport] 保存開始: localId=${report.localId}, status=${report.status}`);

    // 写真が設定されている場合、存在確認
    if (report.localPhotos && report.localPhotos.length > 0) {
      console.log(`[LocalReport] 写真数: ${report.localPhotos.length}`);
      for (const photo of report.localPhotos) {
        const info = await FileSystem.getInfoAsync(photo.localPath);
        console.log(`[LocalReport] 写真確認: ${photo.localPath} - ${info.exists ? '存在' : '見つからない'}`);
      }
    }

    const reports = await getLocalReports();
    const existingIndex = reports.findIndex(r => r.localId === report.localId);

    if (existingIndex >= 0) {
      console.log(`[LocalReport] 既存レポートを更新: index=${existingIndex}`);
      reports[existingIndex] = { ...report, updatedAt: new Date().toISOString() };
    } else {
      console.log(`[LocalReport] 新規レポートを追加`);
      reports.push({ ...report, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    await AsyncStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
    console.log(`[LocalReport] 保存完了: localId=${report.localId}, 合計${reports.length}件`);
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

// 全ローカル日報を削除（デバッグ用）
export async function clearAllLocalReports(): Promise<boolean> {
  try {
    const reports = await getLocalReports();

    // 全ての署名画像と写真を削除
    for (const report of reports) {
      if (report.signatureLocalPath) {
        await deleteSignatureLocally(report.signatureLocalPath);
      }
      if (report.localPhotos) {
        for (const photo of report.localPhotos) {
          if (photo.localPath) {
            await deletePhotoLocally(photo.localPath);
          }
        }
      }
    }

    await AsyncStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify([]));
    console.log('[Debug] 全ローカル日報を削除しました');
    return true;
  } catch (error) {
    console.error('全ローカル日報削除エラー:', error);
    return false;
  }
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
