import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/login" className="text-lg font-bold">
            作業日報
          </Link>
          <Link
            to="/login"
            className="text-sm bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
        <Outlet />
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-gray-400 text-sm py-6 px-4 text-center">
        <div className="flex justify-center gap-6 mb-3">
          <Link to="/help" className="hover:text-white transition">ヘルプ</Link>
          <Link to="/legal/terms" className="hover:text-white transition">利用規約</Link>
          <Link to="/legal/privacy" className="hover:text-white transition">プライバシーポリシー</Link>
        </div>
        <p>&copy; 2026 業務改善屋さん All rights reserved.</p>
      </footer>
    </div>
  );
}
