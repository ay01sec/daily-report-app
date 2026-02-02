import { useAuth } from '../../contexts/AuthContext';
import OnlineStatus from './OnlineStatus';

export default function Header() {
  const { userInfo, companyInfo, logout } = useAuth();

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await logout();
    }
  };

  return (
    <header>
      <div className="bg-blue-600 text-white shadow-md">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">作業日報</h1>
              {companyInfo && (
                <p className="text-blue-100 text-xs mt-0.5">{companyInfo.companyName}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {userInfo && (
                <span className="text-sm text-blue-100">
                  {userInfo.displayName || userInfo.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-sm bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
      <OnlineStatus />
    </header>
  );
}
