import { useOfflineStorage } from '../../hooks/useOfflineStorage';

export default function OnlineStatus() {
  const { online, syncing, pendingCount } = useOfflineStorage();

  if (online && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 text-sm text-center ${
        online
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {!online ? (
        <span>オフラインモード - データはローカルに保存されます</span>
      ) : syncing ? (
        <span>同期中...</span>
      ) : pendingCount > 0 ? (
        <span>未同期の下書きが {pendingCount} 件あります</span>
      ) : null}
    </div>
  );
}
