import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Help: undefined;
  TermsOfService: undefined;
};

type TermsOfServiceScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TermsOfService'>;
};

export default function TermsOfServiceScreen({ navigation }: TermsOfServiceScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>&larr; 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.h1}>利用規約</Text>
          <Text style={styles.updated}>最終更新日: 2026年2月10日</Text>

          <Text style={styles.p}>
            本利用規約（以下「本規約」）は、<Text style={styles.bold}>AYBDX株式会社</Text>（以下「当社」）が提供する作業日報アプリ -CDS-（以下「本アプリ」）の利用条件を定めるものです。本アプリをご利用いただく前に、本規約をよくお読みください。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>1. 定義</Text>
          <Text style={styles.p}>
            本規約において使用する用語の定義は、以下のとおりとします。{'\n\n'}
            • <Text style={styles.bold}>本サービス</Text>: 当社が提供する作業日報アプリ -CDS- およびこれに付随するすべてのサービス{'\n'}
            • <Text style={styles.bold}>利用者</Text>: 本アプリを利用するすべての個人または法人{'\n'}
            • <Text style={styles.bold}>企業</Text>: 本サービスに企業として登録した法人または個人事業主{'\n'}
            • <Text style={styles.bold}>管理者</Text>: 企業の管理権限を持つ利用者{'\n'}
            • <Text style={styles.bold}>従業員</Text>: 企業に所属する利用者{'\n'}
            • <Text style={styles.bold}>コンテンツ</Text>: 本アプリ上で利用者が作成、送信、保存するすべてのデータ
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>2. 規約への同意</Text>
          <Text style={styles.p}>
            2.1 利用者は、本アプリを利用することにより、本規約に同意したものとみなされます。{'\n\n'}
            2.2 本規約に同意いただけない場合は、本アプリを利用することはできません。{'\n\n'}
            2.3 未成年者が本アプリを利用する場合は、法定代理人の同意が必要です。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>3. アカウント登録</Text>

          <Text style={styles.h3}>3.1 登録要件</Text>
          <Text style={styles.p}>
            本アプリを利用するには、アカウント登録が必要です。登録にあたり、以下の条件を満たす必要があります。{'\n\n'}
            • 正確かつ最新の情報を提供すること{'\n'}
            • 1つの企業につき1つのアカウントのみ登録すること{'\n'}
            • 登録情報に変更があった場合、速やかに更新すること
          </Text>

          <Text style={styles.h3}>3.2 アカウントの管理</Text>
          <Text style={styles.p}>
            • 利用者は、自己のアカウント情報（メールアドレス、パスワード等）を適切に管理する責任を負います{'\n'}
            • 第三者によるアカウントの不正使用があった場合、速やかに当社に報告してください{'\n'}
            • アカウントの譲渡、売買、貸与は禁止されています
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>4. 本アプリの内容</Text>

          <Text style={styles.h3}>4.1 提供機能</Text>
          <Text style={styles.p}>
            本アプリは、以下の機能を提供します。{'\n\n'}
            • 日報作成・編集{'\n'}
            • 写真添付{'\n'}
            • 元請確認サイン取得{'\n'}
            • 日報提出{'\n'}
            • PDF・QRコード表示{'\n'}
            • オフライン保存・自動同期{'\n'}
            • その他付随する機能
          </Text>

          <Text style={styles.h3}>4.2 サービスの変更</Text>
          <Text style={styles.p}>
            当社は、本アプリの内容を予告なく変更、追加、または廃止することがあります。重要な変更がある場合は、本アプリ上でお知らせします。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>5. 料金と支払い</Text>

          <Text style={styles.h3}>5.1 利用料金</Text>
          <Text style={styles.p}>
            • 本サービスの利用料金は、別途定める料金表に従います{'\n'}
            • 料金は予告なく変更される場合があります{'\n'}
            • 料金変更は変更日以降の利用に適用されます
          </Text>

          <Text style={styles.h3}>5.2 無料トライアル</Text>
          <Text style={styles.p}>
            • 新規登録後30日間は無料でご利用いただけます{'\n'}
            • トライアル期間終了後、決済情報を登録しない場合、一部機能が制限されます
          </Text>

          <Text style={styles.h3}>5.3 支払方法</Text>
          <Text style={styles.p}>
            • クレジットカード（VISA、MasterCard、JCB、American Express、Diners Club）
          </Text>

          <Text style={styles.h3}>5.4 返金</Text>
          <Text style={styles.p}>
            デジタルサービスという性質上、サービス提供開始後の返金はいたしかねます。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>6. 禁止事項</Text>
          <Text style={styles.p}>
            利用者は、本アプリの利用にあたり、以下の行為を行ってはなりません。
          </Text>

          <Text style={styles.h3}>6.1 法令違反</Text>
          <Text style={styles.p}>
            • 法令または公序良俗に違反する行為{'\n'}
            • 犯罪行為に関連する行為{'\n'}
            • 当社または第三者の権利を侵害する行為
          </Text>

          <Text style={styles.h3}>6.2 不正行為</Text>
          <Text style={styles.p}>
            • 虚偽の情報を登録する行為{'\n'}
            • 他の利用者のアカウントを不正に使用する行為{'\n'}
            • 本アプリの運営を妨害する行為{'\n'}
            • 不正アクセスまたはこれを試みる行為
          </Text>

          <Text style={styles.h3}>6.3 迷惑行為</Text>
          <Text style={styles.p}>
            • 当社または第三者を誹謗中傷する行為{'\n'}
            • スパムメールや迷惑行為{'\n'}
            • 本アプリを通じて取得した情報を不正に利用する行為
          </Text>

          <Text style={styles.h3}>6.4 技術的制限</Text>
          <Text style={styles.p}>
            • 本アプリのリバースエンジニアリング、逆コンパイル、逆アセンブル{'\n'}
            • 本アプリの機能を不正に利用する行為{'\n'}
            • 自動化ツールを用いた大量アクセス
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>7. 知的財産権</Text>
          <Text style={styles.p}>
            7.1 本アプリおよびそのコンテンツ（ソフトウェア、デザイン、ロゴ、テキスト等）に関する知的財産権は、当社または正当な権利者に帰属します。{'\n\n'}
            7.2 利用者が本アプリ上で作成したコンテンツの著作権は、利用者に帰属します。ただし、当社は本サービスの提供・改善のために必要な範囲で、当該コンテンツを利用できるものとします。{'\n\n'}
            7.3 利用者は、本規約で明示的に許諾された場合を除き、本アプリのコンテンツを複製、改変、配布、または二次利用することはできません。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>8. データの取り扱い</Text>

          <Text style={styles.h3}>8.1 データの保存</Text>
          <Text style={styles.p}>
            • 利用者のデータは、Google Cloud Platform（日本リージョン）に保存されます{'\n'}
            • 当社は、データのバックアップを定期的に実施しますが、完全な復旧を保証するものではありません
          </Text>

          <Text style={styles.h3}>8.2 データの削除</Text>
          <Text style={styles.p}>
            • 解約後、利用者のデータは一定期間保持された後、完全に削除されます{'\n'}
            • データの削除後、復旧はできません
          </Text>

          <Text style={styles.h3}>8.3 個人情報</Text>
          <Text style={styles.p}>
            個人情報の取り扱いについては、プライバシーポリシーをご参照ください。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>9. 免責事項</Text>

          <Text style={styles.h3}>9.1 サービスの提供</Text>
          <Text style={styles.p}>
            当社は、本アプリを「現状有姿」で提供し、以下について保証しません。{'\n\n'}
            • 本アプリが中断なく、エラーなく動作すること{'\n'}
            • 本アプリがすべての環境で正常に動作すること{'\n'}
            • 本アプリのセキュリティに脆弱性がないこと
          </Text>

          <Text style={styles.h3}>9.2 損害</Text>
          <Text style={styles.p}>
            当社は、以下の損害について責任を負いません。{'\n\n'}
            • 本アプリの利用または利用不能により生じた損害{'\n'}
            • データの消失、破損、または漏洩により生じた損害{'\n'}
            • 第三者の行為により生じた損害{'\n'}
            • 天災、停電、通信障害等の不可抗力により生じた損害
          </Text>

          <Text style={styles.h3}>9.3 責任の制限</Text>
          <Text style={styles.p}>
            当社が利用者に対して損害賠償責任を負う場合、その額は、当該損害が発生した月の利用料金を上限とします。ただし、当社の故意または重過失による場合はこの限りではありません。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>10. サービスの中断・終了</Text>

          <Text style={styles.h3}>10.1 一時的な中断</Text>
          <Text style={styles.p}>
            当社は、以下の場合、本アプリを一時的に中断することがあります。{'\n\n'}
            • システムメンテナンスを行う場合{'\n'}
            • 天災、停電、通信障害等が発生した場合{'\n'}
            • その他、運営上必要と判断した場合
          </Text>

          <Text style={styles.h3}>10.2 サービスの終了</Text>
          <Text style={styles.p}>
            当社は、30日以上前に通知することにより、本アプリを終了することができます。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>11. 解約</Text>

          <Text style={styles.h3}>11.1 利用者による解約</Text>
          <Text style={styles.p}>
            • 利用者は、管理画面から本サービスを解約できます{'\n'}
            • 解約した場合、当月末日をもってサービスの利用が停止されます{'\n'}
            • 解約月の利用料金は日割り計算されません
          </Text>

          <Text style={styles.h3}>11.2 当社による解約</Text>
          <Text style={styles.p}>
            当社は、利用者が以下に該当する場合、事前の通知なくアカウントを停止または削除することができます。{'\n\n'}
            • 本規約に違反した場合{'\n'}
            • 料金の支払いを怠った場合{'\n'}
            • 登録情報に虚偽があった場合{'\n'}
            • 長期間利用がない場合{'\n'}
            • その他、当社が不適切と判断した場合
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>12. 規約の変更</Text>
          <Text style={styles.p}>
            12.1 当社は、必要と判断した場合、本規約を変更することができます。{'\n\n'}
            12.2 変更後の規約は、本アプリ上で公開した時点で効力を生じます。{'\n\n'}
            12.3 重要な変更がある場合は、本アプリ上でお知らせします。{'\n\n'}
            12.4 変更後に本アプリを継続して利用した場合、変更後の規約に同意したものとみなされます。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>13. 連絡</Text>

          <Text style={styles.h3}>13.1 当社からの連絡</Text>
          <Text style={styles.p}>
            当社から利用者への連絡は、登録されたメールアドレスへの送信または本アプリ上での掲示により行います。
          </Text>

          <Text style={styles.h3}>13.2 利用者からの連絡</Text>
          <Text style={styles.p}>
            本サービスに関するお問い合わせは、下記までご連絡ください。{'\n\n'}
            <Text style={styles.bold}>メール</Text>: y_akagi@improve-biz.com
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>14. 準拠法・管轄</Text>
          <Text style={styles.p}>
            14.1 本規約は日本法に準拠し、日本法に従って解釈されるものとします。{'\n\n'}
            14.2 本規約に関する紛争については、釧路地方裁判所を第一審の専属的合意管轄裁判所とします。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>15. 分離可能性</Text>
          <Text style={styles.p}>
            本規約のいずれかの条項が無効または執行不能と判断された場合でも、他の条項の有効性には影響しません。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>16. お問い合わせ</Text>
          <Text style={styles.p}>
            本規約に関するお問い合わせは、下記までご連絡ください。{'\n\n'}
            <Text style={styles.bold}>AYBDX株式会社</Text>{'\n'}
            メール: y_akagi@improve-biz.com
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  h1: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  h3: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  p: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
});
