# Claude 指示書 - Daily Report App（日報アプリ）

## 重要な注意事項

**以下の実装内容はすべて確定済みです。**

- 既存のコードを変更する必要がある場合は、必ず事前にユーザーに提案・確認を行ってください
- 追加機能の実装上、既存機能の変更が必要な場合も、都度確認を取ってから実行してください
- ユーザーが確認後に編集要否を判断します

---

## プロジェクト構成

| プロジェクト | 説明 | Hosting URL |
|-------------|------|-------------|
| `daily-report-app` | 日報アプリ（PWA） | https://construction-report.improve-biz.com |
| `labor-admin` | 管理システム（Web） | https://construction-manage.improve-biz.com |
| `functions` | Cloud Functions | asia-northeast1（labor-adminリポジトリ内） |

---

## 完了済み実装一覧

### 1. 認証機能
- Firebase Authentication（メール/パスワード）
- 企業コードによるログイン
- パスワードリセット機能

### 2. 日報作成・編集
- 作業日・天候・現場選択
- 作業員情報の入力（複数名対応）
- 昼休憩なしチェックボックス
- 連絡事項入力
- 写真添付（最大3枚）

### 3. 元請確認サイン機能
- react-signature-canvas による直筆サイン
- Firebase Storage へのサイン画像保存
- サインやり直し機能

### 4. 日報提出・ステータス管理
- draft → signed → submitted → approved/rejected のフロー
- ステータスバッジ表示
- 差戻し理由の表示

### 5. リアルタイムステータス監視
- `useReport` フックで `onSnapshot` によるリアルタイム更新
- ステータス変更時にQRコードモーダル自動表示
- 「承認待ち」表示（スピナー付き）

### 6. PDF・QRコード表示
- 承認済み日報のPDF表示
- QRコード表示（PDF URLへのリンク）
- QRコードモーダル

### 7. ホーム画面
- 月別日報一覧
- 提出状況バナー（提出済み/未提出/期限超過）
- 差戻し警告表示
- PDF・QR確認ガイダンス表示

### 8. PWA対応
- Service Worker
- オフライン対応（下書き保存）
- プッシュ通知

---

## 主要ファイル

### ページ
- `src/pages/HomePage.jsx` - ホーム画面・日報一覧
- `src/pages/ReportNewPage.jsx` - 日報新規作成
- `src/pages/ReportEditPage.jsx` - 日報編集
- `src/pages/ReportDetailPage.jsx` - 日報詳細・PDF/QR表示
- `src/pages/LoginPage.jsx` - ログイン画面
- `src/pages/HelpPage.jsx` - ヘルプ画面

### コンポーネント
- `src/components/report/SignatureModal.jsx` - 署名モーダル
- `src/components/report/SignatureDisplay.jsx` - 署名表示
- `src/components/report/WorkerRow.jsx` - 作業員入力行
- `src/components/common/Header.jsx` - ヘッダー
- `src/components/common/StatusBadge.jsx` - ステータスバッジ
- `src/components/common/PullToRefresh.jsx` - プルリフレッシュ

### フック・コンテキスト
- `src/hooks/useReport.js` - 日報データ取得（リアルタイム）
- `src/contexts/AuthContext.jsx` - 認証コンテキスト

---

## 環境変数

### フロントエンド (`.env`)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 今後のタスクリスト

（新しいタスクがあれば、ここに追記してください）

- [ ]
- [ ]
- [ ]

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-02-06 | リアルタイムステータス監視追加 |
| 2026-02-06 | PDF・QRコード表示機能追加 |
| 2026-02-06 | ホーム画面ガイダンス追加 |
