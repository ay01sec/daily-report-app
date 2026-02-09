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
import Header from '../components/common/Header';

type RootStackParamList = {
  Home: undefined;
  Help: undefined;
  PrivacyPolicy: undefined;
};

type PrivacyPolicyScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>;
};

export default function PrivacyPolicyScreen({ navigation }: PrivacyPolicyScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>&larr; 戻る</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.h1}>プライバシーポリシー</Text>
          <Text style={styles.updated}>最終更新日: 2026年2月10日</Text>

          <Text style={styles.p}>
            <Text style={styles.bold}>業務改善屋さん</Text>（以下「当社」）は、作業日報アプリ -CDS-（以下「本アプリ」）において、お客様の個人情報の保護に努めています。本プライバシーポリシーは、当社が収集する情報、その利用方法、およびお客様の権利について説明します。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>1. 収集する情報</Text>

          <Text style={styles.h3}>1.1 お客様が提供する情報</Text>
          <Text style={styles.p}>
            • <Text style={styles.bold}>アカウント情報</Text>: メールアドレス、パスワード、表示名{'\n'}
            • <Text style={styles.bold}>企業情報</Text>: 会社名、住所、電話番号、代表者名{'\n'}
            • <Text style={styles.bold}>従業員情報</Text>: 氏名、フリガナ、生年月日、住所、電話番号、メールアドレス、雇用形態、入社日、給与情報、資格・免許情報{'\n'}
            • <Text style={styles.bold}>現場情報</Text>: 現場名、住所、工期{'\n'}
            • <Text style={styles.bold}>日報データ</Text>: 作業日、作業内容、勤務時間、写真、署名画像{'\n'}
            • <Text style={styles.bold}>決済情報</Text>: クレジットカード情報（PAY.JPを通じて処理）
          </Text>

          <Text style={styles.h3}>1.2 自動的に収集される情報</Text>
          <Text style={styles.p}>
            • <Text style={styles.bold}>利用ログ</Text>: アクセス日時、利用機能、操作履歴{'\n'}
            • <Text style={styles.bold}>デバイス情報</Text>: デバイス種別、OS、アプリバージョン{'\n'}
            • <Text style={styles.bold}>通信情報</Text>: IPアドレス、ネットワーク状態
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>2. 情報の利用目的</Text>
          <Text style={styles.p}>
            収集した情報は、以下の目的で利用します。{'\n\n'}
            1. <Text style={styles.bold}>サービスの提供</Text>: 本アプリの機能を提供するため{'\n'}
            2. <Text style={styles.bold}>本人確認</Text>: アカウントの認証およびセキュリティの確保{'\n'}
            3. <Text style={styles.bold}>請求処理</Text>: 利用料金の請求および決済処理{'\n'}
            4. <Text style={styles.bold}>サポート</Text>: お問い合わせへの対応およびサポートの提供{'\n'}
            5. <Text style={styles.bold}>サービス改善</Text>: 利用状況の分析およびサービスの改善{'\n'}
            6. <Text style={styles.bold}>通知</Text>: サービスに関する重要なお知らせの送信{'\n'}
            7. <Text style={styles.bold}>不正利用防止</Text>: 不正アクセスや不正利用の検知・防止
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>3. 情報の共有</Text>
          <Text style={styles.p}>
            当社は、以下の場合を除き、お客様の個人情報を第三者と共有しません。
          </Text>

          <Text style={styles.h3}>3.1 お客様の同意がある場合</Text>
          <Text style={styles.p}>
            お客様から明示的な同意を得た場合に限り、第三者と情報を共有します。
          </Text>

          <Text style={styles.h3}>3.2 業務委託先</Text>
          <Text style={styles.p}>
            サービスの運営に必要な範囲で、以下の業務委託先と情報を共有する場合があります。{'\n\n'}
            • <Text style={styles.bold}>Google（Firebase）</Text>: データベース、認証、ストレージ{'\n'}
            • <Text style={styles.bold}>PAY株式会社（PAY.JP）</Text>: 決済処理{'\n'}
            • <Text style={styles.bold}>SendGrid</Text>: メール送信
          </Text>

          <Text style={styles.h3}>3.3 法令に基づく場合</Text>
          <Text style={styles.p}>
            法令に基づく開示請求があった場合、または法的手続きに対応するために必要な場合。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>4. データの保管</Text>

          <Text style={styles.h3}>4.1 保管場所</Text>
          <Text style={styles.p}>
            お客様のデータは、Google Cloud Platform（日本リージョン）に保管されます。
          </Text>

          <Text style={styles.h3}>4.2 保管期間</Text>
          <Text style={styles.p}>
            • <Text style={styles.bold}>アカウント情報</Text>: アカウント削除後90日間{'\n'}
            • <Text style={styles.bold}>日報データ</Text>: 企業の解約後90日間{'\n'}
            • <Text style={styles.bold}>決済情報</Text>: 法令で定められた期間
          </Text>

          <Text style={styles.h3}>4.3 データの削除</Text>
          <Text style={styles.p}>
            アカウントを削除した場合、お客様のデータは上記の保管期間経過後に完全に削除されます。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>5. セキュリティ</Text>
          <Text style={styles.p}>
            当社は、お客様の情報を保護するために以下のセキュリティ対策を実施しています。{'\n\n'}
            • <Text style={styles.bold}>通信の暗号化</Text>: すべての通信はSSL/TLSで暗号化{'\n'}
            • <Text style={styles.bold}>認証セキュリティ</Text>: 2段階認証（MFA）の提供{'\n'}
            • <Text style={styles.bold}>アクセス制御</Text>: ロールベースのアクセス権限管理{'\n'}
            • <Text style={styles.bold}>データ分離</Text>: 企業ごとのデータ分離（マルチテナント）{'\n'}
            • <Text style={styles.bold}>決済セキュリティ</Text>: PCI DSS準拠の決済サービス（PAY.JP）を使用
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>6. お客様の権利</Text>
          <Text style={styles.p}>
            お客様は、ご自身の個人情報について以下の権利を有しています。{'\n\n'}
            • <Text style={styles.bold}>アクセス権</Text>: ご自身の個人情報へのアクセスを請求できます{'\n'}
            • <Text style={styles.bold}>訂正権</Text>: 不正確な個人情報の訂正を請求できます{'\n'}
            • <Text style={styles.bold}>削除権</Text>: 一定の条件下で、個人情報の削除を請求できます{'\n'}
            • <Text style={styles.bold}>データポータビリティ</Text>: 一定の条件下で、個人情報を構造化された形式で受け取ることができます{'\n\n'}
            上記の権利を行使する場合は、下記のお問い合わせ先までご連絡ください。本人確認のうえ、対応いたします。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>7. 未成年者について</Text>
          <Text style={styles.p}>
            本アプリは、18歳未満の方を対象としていません。18歳未満の方が本アプリを利用する場合は、保護者の同意が必要です。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>8. プライバシーポリシーの変更</Text>
          <Text style={styles.p}>
            当社は、法令の変更やサービスの改善に伴い、本プライバシーポリシーを変更することがあります。重要な変更がある場合は、本アプリ上でお知らせします。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>9. お問い合わせ</Text>
          <Text style={styles.p}>
            個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。{'\n\n'}
            <Text style={styles.bold}>業務改善屋さん</Text>{'\n'}
            個人情報保護管理者: 赤木恭哉{'\n'}
            メール: y_akagi@improve-biz.com
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>10. 準拠法・管轄</Text>
          <Text style={styles.p}>
            本プライバシーポリシーは日本法に準拠し、日本法に従って解釈されるものとします。本プライバシーポリシーに関する紛争については、釧路地方裁判所を第一審の専属的合意管轄裁判所とします。
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backLink: {
    color: '#2563eb',
    fontSize: 14,
    marginBottom: 16,
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
