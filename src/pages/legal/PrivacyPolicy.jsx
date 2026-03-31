import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/common/Header';
import PublicHeader from '../../components/common/PublicHeader';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {currentUser ? <Header /> : <PublicHeader />}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {currentUser && (
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 text-sm mb-4 inline-block"
          >
            &larr; 戻る
          </button>
        )}

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h1 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 mb-5">プライバシーポリシー</h1>
          <p className="text-xs text-gray-500 mb-4">最終更新日: 2026年2月10日</p>

          <p className="text-sm text-gray-600 mb-6">
            <strong>AYBDX株式会社</strong>（以下「当社」）は、作業日報アプリ -CDS-（以下「本アプリ」）において、お客様の個人情報の保護に努めています。本プライバシーポリシーは、当社が収集する情報、その利用方法、およびお客様の権利について説明します。
          </p>

          <Section title="1. 収集する情報">
            <h4 className="font-medium text-gray-700 mt-3 mb-2">1.1 お客様が提供する情報</h4>
            <ul>
              <li><strong>アカウント情報</strong>: メールアドレス、パスワード、表示名</li>
              <li><strong>企業情報</strong>: 会社名、住所、電話番号、代表者名</li>
              <li><strong>従業員情報</strong>: 氏名、フリガナ、生年月日、住所、電話番号、メールアドレス、雇用形態、入社日、給与情報、資格・免許情報</li>
              <li><strong>現場情報</strong>: 現場名、住所、工期</li>
              <li><strong>日報データ</strong>: 作業日、作業内容、勤務時間、写真、署名画像</li>
              <li><strong>決済情報</strong>: クレジットカード情報（PAY.JPを通じて処理）</li>
            </ul>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">1.2 自動的に収集される情報</h4>
            <ul>
              <li><strong>利用ログ</strong>: アクセス日時、利用機能、操作履歴</li>
              <li><strong>デバイス情報</strong>: デバイス種別、OS、アプリバージョン</li>
              <li><strong>通信情報</strong>: IPアドレス、ネットワーク状態</li>
            </ul>
          </Section>

          <Section title="2. 情報の利用目的">
            <p>収集した情報は、以下の目的で利用します。</p>
            <ul>
              <li><strong>サービスの提供</strong>: 本アプリの機能を提供するため</li>
              <li><strong>本人確認</strong>: アカウントの認証およびセキュリティの確保</li>
              <li><strong>請求処理</strong>: 利用料金の請求および決済処理</li>
              <li><strong>サポート</strong>: お問い合わせへの対応およびサポートの提供</li>
              <li><strong>サービス改善</strong>: 利用状況の分析およびサービスの改善</li>
              <li><strong>通知</strong>: サービスに関する重要なお知らせの送信</li>
              <li><strong>不正利用防止</strong>: 不正アクセスや不正利用の検知・防止</li>
            </ul>
          </Section>

          <Section title="3. 情報の共有">
            <p>当社は、以下の場合を除き、お客様の個人情報を第三者と共有しません。</p>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">3.1 お客様の同意がある場合</h4>
            <p>お客様から明示的な同意を得た場合に限り、第三者と情報を共有します。</p>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">3.2 業務委託先</h4>
            <p>サービスの運営に必要な範囲で、以下の業務委託先と情報を共有する場合があります。</p>
            <ul>
              <li><strong>Google（Firebase）</strong>: データベース、認証、ストレージ</li>
              <li><strong>PAY株式会社（PAY.JP）</strong>: 決済処理</li>
              <li><strong>SendGrid</strong>: メール送信</li>
            </ul>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">3.3 法令に基づく場合</h4>
            <p>法令に基づく開示請求があった場合、または法的手続きに対応するために必要な場合。</p>
          </Section>

          <Section title="4. データの保管">
            <h4 className="font-medium text-gray-700 mt-3 mb-2">4.1 保管場所</h4>
            <p>お客様のデータは、Google Cloud Platform（日本リージョン）に保管されます。</p>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">4.2 保管期間</h4>
            <ul>
              <li><strong>アカウント情報</strong>: アカウント削除後90日間</li>
              <li><strong>日報データ</strong>: 企業の解約後90日間</li>
              <li><strong>決済情報</strong>: 法令で定められた期間</li>
            </ul>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">4.3 データの削除</h4>
            <p>アカウントを削除した場合、お客様のデータは上記の保管期間経過後に完全に削除されます。</p>
          </Section>

          <Section title="5. セキュリティ">
            <p>当社は、お客様の情報を保護するために以下のセキュリティ対策を実施しています。</p>
            <ul>
              <li><strong>通信の暗号化</strong>: すべての通信はSSL/TLSで暗号化</li>
              <li><strong>認証セキュリティ</strong>: 2段階認証（MFA）の提供</li>
              <li><strong>アクセス制御</strong>: ロールベースのアクセス権限管理</li>
              <li><strong>データ分離</strong>: 企業ごとのデータ分離（マルチテナント）</li>
              <li><strong>決済セキュリティ</strong>: PCI DSS準拠の決済サービス（PAY.JP）を使用</li>
            </ul>
          </Section>

          <Section title="6. お客様の権利">
            <p>お客様は、ご自身の個人情報について以下の権利を有しています。</p>
            <ul>
              <li><strong>アクセス権</strong>: ご自身の個人情報へのアクセスを請求できます</li>
              <li><strong>訂正権</strong>: 不正確な個人情報の訂正を請求できます</li>
              <li><strong>削除権</strong>: 一定の条件下で、個人情報の削除を請求できます</li>
              <li><strong>データポータビリティ</strong>: 一定の条件下で、個人情報を構造化された形式で受け取ることができます</li>
            </ul>
            <p>上記の権利を行使する場合は、下記のお問い合わせ先までご連絡ください。</p>
          </Section>

          <Section title="7. 未成年者について">
            <p>本アプリは、18歳未満の方を対象としていません。18歳未満の方が本アプリを利用する場合は、保護者の同意が必要です。</p>
          </Section>

          <Section title="8. プライバシーポリシーの変更">
            <p>当社は、法令の変更やサービスの改善に伴い、本プライバシーポリシーを変更することがあります。重要な変更がある場合は、本アプリ上でお知らせします。</p>
          </Section>

          <Section title="9. お問い合わせ">
            <p>個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。</p>
            <p><strong>AYBDX株式会社</strong><br />個人情報保護管理者: 赤木恭哉<br />メール: y_akagi@improve-biz.com</p>
          </Section>

          <Section title="10. 準拠法・管轄">
            <p>本プライバシーポリシーは日本法に準拠し、日本法に従って解釈されるものとします。本プライバシーポリシーに関する紛争については、釧路地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="text-sm text-gray-600 space-y-2 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mt-2 [&_li]:mb-1 [&_strong]:text-gray-700">
        {children}
      </div>
    </div>
  );
}
