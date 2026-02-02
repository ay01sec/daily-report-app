import { usePullToRefresh } from '../../hooks/usePullToRefresh';

export default function PullToRefresh({ onRefresh, children }) {
  const { pullDistance, isRefreshing, threshold } = usePullToRefresh(onRefresh);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 10 || isRefreshing;

  return (
    <div className="relative">
      {/* プルインジケーター */}
      <div
        className="absolute left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 ease-out z-50"
        style={{
          height: shouldShow ? `${Math.max(pullDistance, isRefreshing ? 50 : 0)}px` : 0,
          opacity: shouldShow ? 1 : 0,
        }}
      >
        <div
          className={`w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: isRefreshing ? 'rotate(0deg)' : `rotate(${progress * 360}deg)`,
            opacity: progress,
          }}
        />
      </div>

      {/* コンテンツ */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
