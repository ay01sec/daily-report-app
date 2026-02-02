import { usePullToRefresh } from '../../hooks/usePullToRefresh';

export default function PullToRefresh({ onRefresh, children }) {
  const { pullDistance, isRefreshing, threshold } = usePullToRefresh(onRefresh);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 10 || isRefreshing;
  const isReady = progress >= 1;

  return (
    <div className="relative overflow-hidden">
      {/* プルインジケーター */}
      <div
        className="absolute left-0 right-0 flex flex-col justify-center items-center z-50 bg-gray-100"
        style={{
          height: shouldShow ? `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px` : 0,
          opacity: shouldShow ? 1 : 0,
          transition: 'height 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {isRefreshing ? (
            <>
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"
                   style={{ borderWidth: '3px' }} />
              <span className="text-sm text-blue-600 font-medium">更新中...</span>
            </>
          ) : (
            <>
              <div
                className="text-2xl transition-transform duration-200"
                style={{
                  transform: isReady ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ↓
              </div>
              <span className={`text-sm font-medium ${isReady ? 'text-blue-600' : 'text-gray-500'}`}>
                {isReady ? '離して更新' : '引っ張って更新'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
