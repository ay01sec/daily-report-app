/**
 * Firestore ドキュメントスナップショットのユーティリティ関数
 *
 * React Native Firebase SDK では、バージョンによって exists と data の
 * アクセス方法が異なる（プロパティ vs メソッド）ため、互換性を保つための
 * ヘルパー関数を提供します。
 */

/**
 * ドキュメントスナップショットの exists を安全に取得
 * @param snapshot - Firestore ドキュメントスナップショット
 * @returns ドキュメントが存在するかどうか
 */
export function getSnapshotExists(snapshot: any): boolean {
  if (!snapshot) return false;
  return typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists;
}

/**
 * ドキュメントスナップショットの data を安全に取得
 * @param snapshot - Firestore ドキュメントスナップショット
 * @returns ドキュメントのデータ（存在しない場合は undefined）
 */
export function getSnapshotData<T = any>(snapshot: any): T | undefined {
  if (!snapshot) return undefined;
  if (!getSnapshotExists(snapshot)) return undefined;
  return typeof snapshot.data === 'function' ? snapshot.data() : snapshot.data;
}

/**
 * ドキュメントスナップショットから exists と data を一度に取得
 * @param snapshot - Firestore ドキュメントスナップショット
 * @returns { exists: boolean, data: T | undefined }
 */
export function extractSnapshot<T = any>(snapshot: any): { exists: boolean; data: T | undefined } {
  const exists = getSnapshotExists(snapshot);
  const data = exists ? getSnapshotData<T>(snapshot) : undefined;
  return { exists, data };
}
