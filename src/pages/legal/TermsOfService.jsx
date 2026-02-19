import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/common/Header';
import PublicHeader from '../../components/common/PublicHeader';

export default function TermsOfService() {
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
          <h1 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-3 mb-5">利用規約</h1>
          <p className="text-xs text-gray-500 mb-4">最終更新日: 2026年2月10日</p>

          <p className="text-sm text-gray-600 mb-6">
            本利用規約（以下「本規約」）は、<strong>業務改善屋さん</strong>（以下「当社」）が提供する作業日報アプリ -CDS-（以下「本アプリ」）の利用条件を定めるものです。本アプリをご利用いただく前に、本規約をよくお読みください。
          </p>

          <Section title="1. 定義">
            <p>本規約において使用する用語の定義は、以下のとおりとします。</p>
            <ul>
              <li><strong>本サービス</strong>: 当社が提供する作業日報アプリ -CDS- およびこれに付随するすべてのサービス</li>
              <li><strong>利用者</strong>: 本アプリを利用するすべての個人または法人</li>
              <li><strong>企業</strong>: 本サービスに企業として登録した法人または個人事業主</li>
              <li><strong>管理者</strong>: 企業の管理権限を持つ利用者</li>
              <li><strong>従業員</strong>: 企業に所属する利用者</li>
              <li><strong>コンテンツ</strong>: 本アプリ上で利用者が作成、送信、保存するすべてのデータ</li>
            </ul>
          </Section>

          <Section title="2. 規約への同意">
            <p>2.1 利用者は、本アプリを利用することにより、本規約に同意したものとみなされます。</p>
            <p>2.2 本規約に同意いただけない場合は、本アプリを利用することはできません。</p>
            <p>2.3 未成年者が本アプリを利用する場合は、法定代理人の同意が必要です。</p>
          </Section>

          <Section title="3. アカウント登録">
            <h4 className="font-medium text-gray-700 mt-3 mb-2">3.1 登録要件</h4>
            <p>本アプリを利用するには、アカウント登録が必要です。登録にあたり、以下の条件を満たす必要があります。</p>
            <ul>
              <li>正確かつ最新の情報を提供すること</li>
              <li>1つの企業につき1つのアカウントのみ登録すること</li>
              <li>登録情報に変更があった場合、速やかに更新すること</li>
            </ul>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">3.2 アカウントの管理</h4>
            <ul>
              <li>利用者は、自己のアカウント情報を適切に管理する責任を負います</li>
              <li>第三者によるアカウントの不正使用があった場合、速やかに当社に報告してください</li>
              <li>アカウントの譲渡、売買、貸与は禁止されています</li>
            </ul>
          </Section>

          <Section title="4. 本アプリの内容">
            <h4 className="font-medium text-gray-700 mt-3 mb-2">4.1 提供機能</h4>
            <p>本アプリは、以下の機能を提供します。</p>
            <ul>
              <li>日報作成・編集</li>
              <li>写真添付</li>
              <li>元請確認サイン取得</li>
              <li>日報提出</li>
              <li>PDF・QRコード表示</li>
              <li>オフライン保存・自動同期</li>
            </ul>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">4.2 サービスの変更</h4>
            <p>当社は、本アプリの内容を予告なく変更、追加、または廃止することがあります。</p>
          </Section>

          <Section title="5. 料金と支払い">
            <h4 className="font-medium text-gray-700 mt-3 mb-2">5.1 利用料金</h4>
            <p>本サービスの利用料金は、別途定める料金表に従います。料金は予告なく変更される場合があります。</p>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">5.2 無料トライアル</h4>
            <p>新規登録後30日間は無料でご利用いただけます。</p>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">5.3 支払方法</h4>
            <p>クレジットカード（VISA、MasterCard、JCB、American Express、Diners Club）</p>
            <h4 className="font-medium text-gray-700 mt-3 mb-2">5.4 返金</h4>
            <p>デジタルサービスという性質上、サービス提供開始後の返金はいたしかねます。</p>
          </Section>

          <Section title="6. 禁止事項">
            <p>利用者は、本アプリの利用にあたり、以下の行為を行ってはなりません。</p>
            <ul>
              <li>法令または公序良俗に違反する行為</li>
              <li>虚偽の情報を登録する行為</li>
              <li>他の利用者のアカウントを不正に使用する行為</li>
              <li>本アプリの運営を妨害する行為</li>
              <li>不正アクセスまたはこれを試みる行為</li>
              <li>当社または第三者を誹謗中傷する行為</li>
              <li>本アプリのリバースエンジニアリング</li>
            </ul>
          </Section>

          <Section title="7. 知的財産権">
            <p>本アプリおよびそのコンテンツに関する知的財産権は、当社または正当な権利者に帰属します。利用者が本アプリ上で作成したコンテンツの著作権は、利用者に帰属します。</p>
          </Section>

          <Section title="8. データの取り扱い">
            <p>利用者のデータは、Google Cloud Platform（日本リージョン）に保存されます。解約後、データは一定期間保持された後、完全に削除されます。</p>
          </Section>

          <Section title="9. 免責事項">
            <p>当社は、本アプリを「現状有姿」で提供し、中断なく動作すること等を保証しません。当社が利用者に対して損害賠償責任を負う場合、その額は当該月の利用料金を上限とします。</p>
          </Section>

          <Section title="10. サービスの中断・終了">
            <p>当社は、システムメンテナンスや不可抗力により本アプリを一時中断することがあります。当社は、30日以上前に通知することにより、本アプリを終了できます。</p>
          </Section>

          <Section title="11. 解約">
            <p>利用者は、管理画面から本サービスを解約できます。当社は、本規約違反等の場合、事前通知なくアカウントを停止できます。</p>
          </Section>

          <Section title="12. 規約の変更">
            <p>当社は、必要と判断した場合、本規約を変更できます。変更後の規約は、本アプリ上で公開した時点で効力を生じます。</p>
          </Section>

          <Section title="13. 準拠法・管轄">
            <p>本規約は日本法に準拠します。本規約に関する紛争については、釧路地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </Section>

          <Section title="14. お問い合わせ">
            <p><strong>業務改善屋さん</strong><br />メール: y_akagi@improve-biz.com</p>
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
