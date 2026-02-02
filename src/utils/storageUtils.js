const DRAFT_PREFIX = 'draft_';
const PENDING_SYNC_KEY = 'pending_sync_reports';

export function saveDraft(reportId, data) {
  try {
    const key = reportId ? `${DRAFT_PREFIX}${reportId}` : `${DRAFT_PREFIX}new_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
    return key;
  } catch (error) {
    console.error('下書き保存エラー:', error);
    return null;
  }
}

export function getDraft(reportId) {
  try {
    const key = `${DRAFT_PREFIX}${reportId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('下書き読み込みエラー:', error);
    return null;
  }
}

export function getAllDrafts() {
  const drafts = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          drafts.push({
            key,
            reportId: key.replace(DRAFT_PREFIX, ''),
            ...JSON.parse(data),
          });
        }
      }
    }
  } catch (error) {
    console.error('下書き一覧取得エラー:', error);
  }
  return drafts;
}

export function deleteDraft(reportId) {
  try {
    const key = `${DRAFT_PREFIX}${reportId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('下書き削除エラー:', error);
    return false;
  }
}

export function deleteDraftByKey(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('下書き削除エラー:', error);
    return false;
  }
}

export function addPendingSync(reportData) {
  try {
    const pending = getPendingSyncs();
    const id = `pending_${Date.now()}`;
    pending.push({
      id,
      ...reportData,
      pendingSince: new Date().toISOString(),
    });
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    return id;
  } catch (error) {
    console.error('同期待ち追加エラー:', error);
    return null;
  }
}

export function getPendingSyncs() {
  try {
    const data = localStorage.getItem(PENDING_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('同期待ち取得エラー:', error);
    return [];
  }
}

export function removePendingSync(id) {
  try {
    const pending = getPendingSyncs();
    const updated = pending.filter((item) => item.id !== id);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('同期待ち削除エラー:', error);
    return false;
  }
}

export function clearPendingSyncs() {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
    return true;
  } catch (error) {
    console.error('同期待ちクリアエラー:', error);
    return false;
  }
}

export function isOnline() {
  return navigator.onLine;
}
