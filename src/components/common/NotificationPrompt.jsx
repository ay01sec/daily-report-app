import { useState } from 'react';
import { useNotification } from '../../hooks/useNotification';

export default function NotificationPrompt() {
  const { permission, loading, isSupported, requestPermission } = useNotification();
  // ページリフレッシュ時に再表示するため、localStorageではなくstateのみで管理
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    await requestPermission();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">🔔</div>
        <div className="flex-1">
          <h3 className="font-medium text-blue-900">通知を有効にしますか？</h3>
          <p className="text-sm text-blue-700 mt-1">
            日報の提出リマインダーや差戻し通知を受け取れます
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '設定中...' : '有効にする'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-blue-600 text-sm font-medium hover:bg-blue-100 rounded-lg transition-colors"
            >
              あとで
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
