import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// タイムアウト付きPromise
function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// リトライ付き関数
async function withRetry(fn, maxRetries = 2, delayMs = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // ネットワークエラーまたはタイムアウトの場合のみリトライ
      const isRetryable =
        error.code === 'auth/network-request-failed' ||
        error.message?.includes('タイムアウト') ||
        error.message?.includes('network');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      // リトライ前に待機
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// エラーメッセージを日本語に変換
function getErrorMessage(error) {
  const errorCode = error.code || '';
  const errorMessage = error.message || '';

  // Firebase Authエラー
  if (errorCode === 'auth/user-not-found') {
    return 'このメールアドレスは登録されていません';
  }
  if (errorCode === 'auth/wrong-password') {
    return 'パスワードが正しくありません';
  }
  if (errorCode === 'auth/invalid-credential') {
    return 'メールアドレスまたはパスワードが正しくありません';
  }
  if (errorCode === 'auth/invalid-email') {
    return 'メールアドレスの形式が正しくありません';
  }
  if (errorCode === 'auth/user-disabled') {
    return 'このアカウントは無効化されています';
  }
  if (errorCode === 'auth/too-many-requests') {
    return 'ログイン試行回数が多すぎます。しばらく待ってから再度お試しください';
  }
  if (errorCode === 'auth/network-request-failed') {
    return 'ネットワークエラーが発生しました。インターネット接続を確認してください';
  }

  // タイムアウト
  if (errorMessage.includes('タイムアウト')) {
    return 'サーバーからの応答がありません。しばらく待ってから再度お試しください';
  }

  // カスタムエラー（AuthContextからのエラー）
  if (errorMessage === '企業IDが見つかりません') {
    return '企業IDが見つかりません。正しい8桁の数字を入力してください';
  }
  if (errorMessage === 'この企業IDに登録されていないユーザーです') {
    return 'この企業IDに登録されていないユーザーです';
  }
  if (errorMessage === 'このアカウントは無効化されています') {
    return 'このアカウントは無効化されています。管理者にお問い合わせください';
  }
  if (errorMessage === '日報アプリへのアクセス権限がありません') {
    return '日報アプリへのアクセス権限がありません。管理者にお問い合わせください';
  }

  // その他のエラー
  if (errorMessage) {
    return errorMessage;
  }
  return 'ログインに失敗しました。しばらく待ってから再度お試しください';
}

export default function LoginPage() {
  const [companyCode, setCompanyCode] = useState(() => {
    return localStorage.getItem('lastCompanyCode') || '';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleCompanyCodeChange = (e) => {
    // 数字のみ許可、最大8桁
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setCompanyCode(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (companyCode.length !== 8) {
      setError('企業IDは8桁の数字で入力してください');
      return;
    }

    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    setLoading(true);

    try {
      // タイムアウト30秒、リトライ2回で実行
      await withRetry(
        () => withTimeout(
          login(companyCode, email, password),
          30000,
          'ログイン処理がタイムアウトしました'
        ),
        2,
        1000
      );
      navigate(from, { replace: true });
    } catch (err) {
      console.error('ログインエラー:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          作業日報
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          ログインしてください
        </p>
      </div>

      {/* ご利用にあたって */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
          <h2 className="text-sm font-semibold text-blue-800 mb-2">ご利用にあたって</h2>
          <p className="text-sm text-blue-700 leading-relaxed">
            このアプリは「作業日報アプリ -CDS-」です。
          </p>
          <p className="text-sm text-blue-700 leading-relaxed mt-1">
            ご利用には下記サイトの「無料で始める」から企業登録を行い、ユーザー登録を完了させてください。
          </p>
          <a
            href="https://construction-manage.improve-biz.com/lp.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
          >
            https://construction-manage.improve-biz.com/lp.html
          </a>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="companyCode"
                className="block text-sm font-medium text-gray-700"
              >
                企業ID
              </label>
              <input
                id="companyCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={companyCode}
                onChange={handleCompanyCodeChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base tracking-widest"
                placeholder="12345678"
                maxLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">8桁の数字</p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="example@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="********"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    // 目を閉じるアイコン（非表示にする）
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    // 目を開くアイコン（表示する）
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ログイン中...
                </span>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              パスワードをお忘れですか？
            </Link>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-4">
          <Link to="/help" className="hover:text-gray-700">ヘルプ</Link>
          <Link to="/legal/terms" className="hover:text-gray-700">利用規約</Link>
          <Link to="/legal/privacy" className="hover:text-gray-700">プライバシーポリシー</Link>
        </div>
      </div>
    </div>
  );
}
