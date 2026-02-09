# 作業日報アプリ - React Native モバイル版

既存のWebアプリ（PWA）を完全にReact Nativeで再現したネイティブアプリです。

## セットアップ

### 1. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、Firebase の設定値を入力してください：

```bash
cp .env.example .env
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm start
```

## ビルド

### 開発ビルド

```bash
# EAS CLIをインストール（初回のみ）
npm install -g eas-cli

# EASにログイン
eas login

# プロジェクトIDを設定（app.jsonのextra.eas.projectIdを更新）
eas init

# 開発ビルド
eas build --profile development --platform ios
eas build --profile development --platform android
```

### プロダクションビルド

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# 両方
eas build --platform all
```

## プロジェクト構造

```
mobile/
├── src/
│   ├── components/         # 再利用可能なUIコンポーネント
│   │   ├── common/         # 共通コンポーネント
│   │   │   ├── Header.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── OnlineStatus.tsx
│   │   └── report/         # 日報関連コンポーネント
│   │       ├── ReportForm.tsx
│   │       ├── WorkerRow.tsx
│   │       ├── PhotoUploader.tsx
│   │       ├── SignatureModal.tsx
│   │       └── SignatureDisplay.tsx
│   ├── screens/            # 画面コンポーネント
│   │   ├── LoginScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── ReportNewScreen.tsx
│   │   ├── ReportEditScreen.tsx
│   │   ├── ReportDetailScreen.tsx
│   │   └── HelpScreen.tsx
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx
│   ├── hooks/              # カスタムフック
│   │   ├── useReport.ts
│   │   ├── useEmployees.ts
│   │   ├── useSites.ts
│   │   └── useOfflineStorage.ts
│   ├── utils/              # ユーティリティ関数
│   │   ├── dateUtils.ts
│   │   ├── storageUtils.ts
│   │   └── validationUtils.ts
│   ├── navigation/         # ナビゲーション設定
│   │   └── AppNavigator.tsx
│   └── config/             # 設定ファイル
│       └── firebase.ts
├── App.tsx                 # エントリポイント
├── app.json                # Expo設定
├── eas.json                # EASビルド設定
└── package.json
```

## 機能

### Webアプリから完全移植した機能

- **認証機能**
  - 企業コード + メール/パスワード認証
  - パスワードリセット
  - ロールベースアクセス制御（admin/manager）

- **日報管理**
  - 日報作成・編集・閲覧
  - 作業員情報の入力（複数名対応）
  - 天候選択
  - 現場選択
  - 連絡事項入力

- **写真添付**
  - カメラ撮影
  - ライブラリから選択
  - 最大3枚まで添付可能

- **署名機能**
  - 全画面署名キャプチャ
  - Firebase Storageへの保存
  - 署名やり直し

- **ステータス管理**
  - draft → signed → submitted → approved/rejected
  - リアルタイムステータス監視

- **PDF/QRコード**
  - 承認済み日報のPDF表示
  - QRコード表示

- **オフライン対応**
  - AsyncStorageによる下書き保存
  - オンライン復帰時の自動同期

## 使用技術

- **フレームワーク**: React Native (Expo)
- **言語**: TypeScript
- **ナビゲーション**: React Navigation
- **バックエンド**: Firebase (Auth, Firestore, Storage)
- **状態管理**: React Context API
- **ストレージ**: AsyncStorage

## 注意事項

- Firebase環境変数は必ず設定してください
- iOS実機でのテストにはApple Developer Programへの登録が必要です
- プッシュ通知を使用する場合は、Firebase Cloud Messagingの追加設定が必要です
