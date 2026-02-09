import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = 'draft_';
const PENDING_SYNC_KEY = 'pending_sync_reports';

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
