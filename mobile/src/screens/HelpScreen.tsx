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
};

type HelpScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Help'>;
};

export default function HelpScreen({ navigation }: HelpScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>&larr; 戻る</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.h1}>作業日報アプリ 操作マニュアル</Text>

          <Text style={styles.h2}>ログイン</Text>
          <Text style={styles.p}>
            1. 企業コード（8桁の数字）を入力します{'\n'}
            2. メールアドレスとパスワードを入力します{'\n'}
            3. 「ログイン」ボタンをタップします
          </Text>
          <Text style={styles.note}>
            企業コードは前回入力した値が自動的に保存されます。パスワードを忘れた場合は「パスワードを忘れた方」をタップしてください。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>ホーム画面</Text>
          <Text style={styles.p}>
            ログイン後のメインページです。自分が作成した日報の一覧が表示されます。
          </Text>
          <Text style={styles.p}>
            • 月切替: 画面上部のドロップダウンで表示する月を変更できます{'\n'}
            • 日報一覧: 日付・現場名・ステータスがカード形式で表示されます{'\n'}
            • 新規作成: 「+ 新規作成」ボタンから新しい日報を作成できます{'\n'}
            • 更新: 画面を下に引っ張ると最新データに更新されます
          </Text>

          <Text style={styles.h3}>ステータスの見方</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>色</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>ステータス</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>意味</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>グレー</Text>
              <Text style={styles.tableCell}>下書き</Text>
              <Text style={styles.tableCell}>保存済み。署名・提出がまだ</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>黄色</Text>
              <Text style={styles.tableCell}>署名済み</Text>
              <Text style={styles.tableCell}>署名を取得済み。まだ提出していない</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>青</Text>
              <Text style={styles.tableCell}>提出済み</Text>
              <Text style={styles.tableCell}>管理者に送信済み。承認待ち</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>緑</Text>
              <Text style={styles.tableCell}>承認済み</Text>
              <Text style={styles.tableCell}>管理者に承認された</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>赤</Text>
              <Text style={styles.tableCell}>却下</Text>
              <Text style={styles.tableCell}>差し戻し。修正が必要</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.h2}>日報を作成する</Text>
          <Text style={styles.h3}>手順1: 日報の入力</Text>
          <Text style={styles.p}>
            1. ホーム画面の「+ 新規作成」ボタンをタップします{'\n'}
            2. 以下の項目を入力します：{'\n'}
            　• 作業日（必須）: 日付を選択します{'\n'}
            　• 天候: 晴れ・曇り・雨・雪から選択{'\n'}
            　• 現場名（必須）: 稼働中の現場から選択{'\n'}
            　• 作業員（必須）: 1名以上の作業員情報を入力{'\n'}
            　• 連絡事項: 管理者への連絡事項を記入{'\n'}
            　• 写真: 現場の写真を最大3枚まで添付可能
          </Text>

          <Text style={styles.h3}>手順2: 保存</Text>
          <Text style={styles.p}>
            • 「下書き保存」: 下書きとして保存します。後から編集できます{'\n'}
            • 「元請サインへ進む」: 保存してから得意先の署名画面に進みます
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>得意先の署名を取得する</Text>
          <Text style={styles.p}>
            1. 「元請サインへ進む」をタップすると署名画面が表示されます{'\n'}
            2. スマートフォンを得意先の担当者にお渡しください{'\n'}
            3. 担当者に画面上に指で署名してもらいます{'\n'}
            4. 書き直す場合は「クリア」ボタンで消去できます{'\n'}
            5. 署名が完了したら「サイン完了」ボタンをタップします
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>日報を提出する</Text>
          <Text style={styles.p}>
            1. ホーム画面から「署名済み」の日報をタップします{'\n'}
            2. 編集画面で内容を確認します{'\n'}
            3. 「送信する」ボタンをタップします{'\n'}
            4. 確認ダイアログで「送信する」を選択します{'\n'}
            5. 提出が完了するとホーム画面に戻ります
          </Text>
          <Text style={styles.note}>
            提出後は内容の変更ができなくなります。提出前に内容をよく確認してください。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>PDF・QRコードを確認する</Text>
          <Text style={styles.p}>
            承認済みの日報にはPDFとQRコードが生成されます。{'\n'}
            1. ホーム画面から「承認済み」の日報をタップします{'\n'}
            2. 詳細画面の下部に「PDF・QRコード」セクションが表示されます{'\n'}
            3. 「PDF表示」をタップすると日報のPDFを表示します{'\n'}
            4. 「QRコード」をタップするとPDFへのQRコードを表示します
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>オフラインでの利用</Text>
          <Text style={styles.p}>
            インターネットに接続できない環境でも、下書きの保存ができます。{'\n'}
            • オフライン時: 画面上部に「オフラインモード」と表示されます{'\n'}
            • 下書き保存: 日報の入力内容は自動的にスマートフォンに保存されます{'\n'}
            • 自動同期: インターネットに接続されると、保存した下書きが自動的にサーバーに送信されます
          </Text>
          <Text style={styles.note}>
            注意: 署名と提出にはインターネット接続が必要です。
          </Text>

          <View style={styles.divider} />

          <Text style={styles.h2}>よくある質問</Text>

          <Text style={styles.h3}>パスワードを忘れた場合は？</Text>
          <Text style={styles.p}>
            ログイン画面の「パスワードを忘れた方」からリセットメールを送信してください。
          </Text>

          <Text style={styles.h3}>企業コードがわからない場合は？</Text>
          <Text style={styles.p}>
            管理者にお問い合わせください。
          </Text>

          <Text style={styles.h3}>現場が選択肢に表示されない場合は？</Text>
          <Text style={styles.p}>
            管理者が現場を登録していない可能性があります。現場のステータスが「進行中」になっているか管理者に確認してください。
          </Text>

          <Text style={styles.h3}>日報を提出した後に修正したい場合は？</Text>
          <Text style={styles.p}>
            提出済みの日報は修正できません。管理者に連絡して却下してもらい、却下後に修正・再提出してください。
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 12,
    marginBottom: 20,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  h3: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  p: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  note: {
    fontSize: 14,
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    color: '#4b5563',
  },
  tableCellHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: '500',
    color: '#4b5563',
  },
});
