import { Link } from 'react-router-dom';

export default function PublicHeader() {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/login" className="text-lg font-bold">
          作業日報
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/help"
            className="text-sm bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            ヘルプ
          </Link>
          <Link
            to="/login"
            className="text-sm bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            ログイン
          </Link>
        </div>
      </div>
    </header>
  );
}
