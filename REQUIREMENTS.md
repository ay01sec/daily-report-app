# 日報アプリ（モバイルPWA）要件定義書

> **本ドキュメントについて**
> Claude Codeでの開発用要件定義書です。既存の管理画面（labor-admin）とは別リポジトリで構築し、同一のFirebaseプロジェクトを共有します。

---

## 1. プロジェクト概要

### 1-1. サービス概要

建設・土木現場の職長（現場責任者）が、1日の作業内容を日報としてスマートフォン・タブレットから入力・送信するPWAアプリ。元請担当者の直筆サイン機能を備え、管理者はWeb管理画面（別リポジトリ）から承認する。

### 1-2. ユーザーと利用デバイス

| ユーザー | 操作 | デバイス |
|---------|------|---------|
| 職長・現場責任者 | 日報の入力・送信 | スマートフォン / タブレット |
| 元請担当者 | 直筆サインの入力 | 上記デバイスを借りて操作 |
| 管理者 | 承認・確認 | PC（既存管理画面で対応） |

### 1-3. 日報の単位

- **1現場 × 1日 = 1枚の日報**
- 作成者は職長や現場責任者が1人で、その現場の全作業員分をまとめて入力する
- 個々の作業員が自分で入力する方式ではない

---

## 2. 技術スタック

### 2-1. フロントエンド

| 項目 | 技術 |
|------|------|
| フレームワーク | React 18+ |
| スタイリング | Tailwind CSS |
| ビルドツール | Vite |
| PWA | vite-plugin-pwa（Workbox） |
| 直筆サイン | react-signature-canvas（signature_pad ベース） |
| ルーティング | React Router v6 |
| 状態管理 | React hooks（useState / useReducer / useContext） |
| 日付操作 | date-fns |
| 通知 | Firebase Cloud Messaging（FCM） |

### 2-2. バックエンド（Firebase — 既存プロジェクトを共有）

| サービス | 用途 |
|---------|------|
| Firebase Authentication | ユーザー認証（メール/パスワード） |
| Cloud Firestore | データベース |
| Firebase Storage | 直筆サイン画像の保存 |
| Firebase Cloud Messaging | プッシュ通知（日報未提出リマインダー） |
| Cloud Functions（必要に応じて） | 通知スケジュール、バッチ処理 |

### 2-3. ホスティング

| 項目 | 内容 |
|------|------|
| ホスティング | Vercel |
| リポジトリ | GitHub（別リポジトリ。例：`daily-report-app`） |
| Firebase | 管理画面（labor-admin）と同一プロジェクトを共有 |

### 2-4. プロジェクト初期セットアップ

```bash
npm create vite@latest daily-report-app -- --template react
cd daily-report-app
npm install tailwindcss @tailwindcss/vite
npm install firebase
npm install react-router-dom
npm install react-signature-canvas
npm install date-fns
npm install vite-plugin-pwa -D
```

---

## 3. Firebase 共有設定

管理画面（labor-admin）と同一のFirebaseプロジェクトを使用する。firebaseConfig の値は同一。

```javascript
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

環境変数は `.env` ファイルで管理（`.env` は `.gitignore` に含める）。Vercelのダッシュボードにも同じ環境変数を設定する。

---

## 4. Firestore データモデル

### 4-1. 既存コレクション（管理画面で作成済み — 読み取り専用で参照）

| コレクション | 用途 | 日報アプリでの利用 |
|-------------|------|-------------------|
| `companies/{companyId}` | 自社情報 | 会社名の表示 |
| `employees/{employeeId}` | 社員マスタ | 作業員の選択リスト |
| `clients/{clientId}` | 取引先マスタ | 元請の参照 |
| `sites/{siteId}` | 現場マスタ | 現場の選択リスト |
| `users/{userId}` | ユーザー認証情報 | ログイン・権限判定 |

### 4-2. 新規コレクション — dailyReports（日報）

```
dailyReports/{reportId}
│
├── companyId: string              // 企業ID
├── siteId: string                 // 現場ID（sitesコレクション参照）
├── siteName: string               // 現場名（非正規化・表示用）
├── reportDate: timestamp          // 実施日（作業を行った日）
├── submittedAt: timestamp | null  // 送信日時
│
├── createdBy: string              // 作成者のユーザーID
├── createdByName: string          // 作成者名（非正規化・表示用）
│
├── status: string                 // ステータス（後述）
│
├── workers: array                 // 作業員リスト
│   └── [
│         {
│           employeeId: string,    // 社員ID
│           name: string,          // 氏名（非正規化）
│           startTime: string,     // 開始時間（"08:00" 形式）
│           endTime: string,       // 終了時間（"17:00" 形式）
│           noLunchBreak: boolean, // 昼休憩なし
│           remarks: string        // 備考及び作業内容
│         }
│       ]
│
├── notes: string                  // 連絡事項（自由入力）
│
├── clientSignature: {             // 元請確認サイン
│   ├── imageUrl: string | null,   // Firebase Storage上の画像URL
│   ├── signedAt: timestamp | null // サイン日時
│   └── signerName: string | null  // サインした人の名前（任意）
│   }
│
├── approval: {                    // 管理者承認（管理画面から操作）
│   ├── approvedBy: string | null, // 承認者のユーザーID
│   ├── approvedByName: string | null,
│   └── approvedAt: timestamp | null
│   }
│
├── createdAt: timestamp           // ドキュメント作成日時
└── updatedAt: timestamp           // 最終更新日時
```

### 4-3. Firebase Storage パス構成

```
signatures/
  └── {companyId}/
      └── {reportId}/
          └── {timestamp}.png     // 元請サイン画像（PNG）
```

---

## 5. ステータス遷移

### 5-1. ステータス定義

| ステータス | 値 | 意味 |
|-----------|-----|------|
| 下書き | `draft` | 入力開始〜元請サイン完了前 |
| サイン済み | `signed` | 元請の直筆サインが完了（まだ送信していない） |
| 送信完了 | `submitted` | 送信ボタンを押して送信完了 |
| 承認済み | `approved` | 管理者が管理画面で承認 |
| 差戻し | `rejected` | 管理者が差戻し（修正依頼） |

### 5-2. 遷移フロー

```
[新規作成]
    │
    ▼
  draft（下書き）  ←─── rejected（差戻し）からの再編集
    │
    │ 元請担当者が直筆サイン
    ▼
  signed（サイン済み）
    │
    │ 送信ボタン押下
    ▼
  submitted（送信完了）
    │
    ├──→ approved（承認済み）   ※管理画面で操作
    │
    └──→ rejected（差戻し）     ※管理画面で操作
              │
              │ アプリで修正・再サイン・再送信
              ▼
           submitted（再送信）
```

### 5-3. 通知対象

| 条件 | 通知内容 |
|------|---------|
| 日報が未作成（当日分のドキュメントが存在しない） | 「日報未提出」リマインダー |
| ステータスが `draft` または `signed` のまま | 「日報未提出」リマインダー |
| ステータスが `rejected`（差戻し） | 「差戻しがあります」通知 |

通知のタイミングは、Cloud Functionsのスケジュール実行で毎日指定時刻（例：17:00, 20:00）にチェックし、未提出者にプッシュ通知を送信する。

---

## 6. 画面設計

### 6-1. 画面一覧

| # | 画面名 | パス | 概要 |
|---|--------|------|------|
| 1 | ログイン | `/login` | メール/パスワード認証 |
| 2 | ホーム | `/` | 日報一覧（自分が作成した日報） |
| 3 | 日報作成 | `/reports/new` | 新規日報入力画面（元請サインモーダル含む） |
| 4 | 日報編集 | `/reports/:id/edit` | 下書き・差戻しの編集（元請サインモーダル含む） |
| 5 | 日報詳細 | `/reports/:id` | 送信済み日報の閲覧 |

> **元請サインは独立画面ではなく、日報作成・編集画面内のモーダル（オーバーレイ）として実装する。**

### 6-2. 画面詳細

#### 画面1：ログイン（`/login`）

- メールアドレス入力フィールド
- パスワード入力フィールド
- ログインボタン
- エラーメッセージ表示
- ログイン後は `usersコレクション` からユーザー情報（companyId, role等）を取得

#### 画面2：ホーム（`/`）

- ヘッダー：アプリ名、ユーザー名、ログアウトボタン
- 「新規日報作成」ボタン（目立つ位置に配置）
- 日報一覧リスト
  - 表示項目：実施日、現場名、ステータスバッジ
  - ステータスで色分け（draft=グレー、signed=黄、submitted=青、approved=緑、rejected=赤）
  - タップで詳細画面へ遷移
- フィルター：月選択（年月での絞り込み）
- 自分（ログインユーザー）が作成した日報のみ表示

#### 画面3：日報作成（`/reports/new`）

PDF画面案に基づくレイアウト。元請サイン完了後は日報上部にサイン画像を表示する。

```
┌──────────────────────────────────────────┐
│  作業日報                                 │
├──────────────────────────────────────────┤
│                                          │
│  ┌─ 元請確認欄 ─────────────────────┐    │
│  │ [サイン画像表示エリア]             │    │
│  │ （未署名時は「未署名」と表示）      │    │
│  │ 署名日時：2025/01/31 17:30        │    │
│  └──────────────────────────────────┘    │
│                                          │
├──────────────────────────────────────────┤
│  会社名：アースプラン株式会社（自動表示）    │
│  作成者：赤木（ログインユーザー名を自動表示）│
├──────────────────────────────────────────┤
│  報告日：[自動：今日の日付]                │
│  実施日：[DatePicker]                     │
│  現場名：[セレクトボックス] ※現場マスタから │
├──────────────────────────────────────────┤
│  ┌─────┬─────┬─────┬──────┬──────────┐  │
│  │氏名  │開始  │終了  │昼休憩 │備考/作業 │  │
│  │      │時間  │時間  │なし  │内容      │  │
│  ├─────┼─────┼─────┼──────┼──────────┤  │
│  │[選択]│[時間]│[時間]│[□]  │[自由入力]│  │
│  │[選択]│[時間]│[時間]│[□]  │[自由入力]│  │
│  │  ...  │      │      │      │          │  │
│  └─────┴─────┴─────┴──────┴──────────┘  │
│  [＋ 作業員を追加]                         │
├──────────────────────────────────────────┤
│  連絡事項：                               │
│  [自由入力テキストエリア]                   │
├──────────────────────────────────────────┤
│  [下書き保存]  [元請サインへ進む →]         │
└──────────────────────────────────────────┘
```

**元請確認欄の表示ルール：**

| ステータス | 元請確認欄の表示 |
|-----------|-----------------|
| `draft`（未署名） | 「未署名」テキスト + 薄いグレー背景 |
| `signed` / `submitted` / `approved` | サイン画像を表示 + 署名日時 |
| `rejected`（差戻し後の再編集時） | 前回のサイン画像は消去、「未署名」に戻る（再署名が必要） |

**「元請サインへ進む」ボタン押下後の動き：**
1. 入力内容を `draft` でFirestoreに保存
2. **同一画面内でサインモーダルを表示**（別ページ遷移ではなく、オーバーレイで表示）
3. サイン完了後、日報上部の元請確認欄にサイン画像が表示される
4. ステータスは `signed` に更新
5. 画面下部のボタンが「送信する」に切り替わる

入力仕様：
- **実施日**：DatePicker。デフォルトは当日。過去日も選択可能
- **現場名**：セレクトボックス。Firestoreの `sites` コレクションから、自社（companyId一致）かつ `status == "active"` の現場を取得して選択肢に表示
- **作業員の氏名**：セレクトボックス。`employees` コレクションから、自社かつ在籍中（`retirementDate` が null または未来日）の社員を取得して選択肢に表示
- **開始時間・終了時間**：TimePicker（時:分形式）
- **昼休憩なし**：チェックボックス
- **備考及び作業内容**：テキスト入力（自由入力）
- **作業員の追加**：「＋ 作業員を追加」ボタンで行を追加可能。各行に削除ボタン
- **連絡事項**：テキストエリア（複数行、自由入力）
- **下書き保存**：ステータス `draft` でFirestoreに保存
- **元請サインへ進む**：入力内容を `draft` で保存した上で、元請サイン画面へ遷移

バリデーション：
- 実施日：必須
- 現場名：必須
- 作業員：最低1名以上
- 各作業員の氏名・開始時間・終了時間：必須

#### 画面4：日報編集（`/reports/:id/edit`）

- 画面3と同じレイアウト
- Firestoreから既存データを読み込んで初期表示
- `draft` または `rejected` ステータスの日報のみ編集可能
- `submitted` / `approved` のものは編集不可

#### 画面5：日報詳細（`/reports/:id`）

- 日報の全内容を読み取り専用で表示
- 元請サイン画像の表示
- ステータスバッジ表示
- `draft` / `rejected` の場合は「編集」ボタンを表示

#### 画面6：元請サインモーダル（日報作成・編集画面内にオーバーレイ表示）

日報作成画面から「元請サインへ進む」を押すと、**画面遷移ではなくモーダル（オーバーレイ）**として表示する。サイン完了後に日報上部に署名画像が即座に反映される。

```
┌──────────────────────────────────────────┐
│  ┌────────────────────────────────────┐  │
│  │  元請確認サイン              [✕]    │  │
│  ├────────────────────────────────────┤  │
│  │  現場名：現場A                      │  │
│  │  実施日：1月31日                     │  │
│  ├────────────────────────────────────┤  │
│  │  ┌──────────────────────────┐      │  │
│  │  │                          │      │  │
│  │  │  （直筆サイン描画エリア）  │      │  │
│  │  │  Canvas: 幅100%, 高200px │      │  │
│  │  │  背景: 白、ペン色: 黒    │      │  │
│  │  │  ペン幅: 2.5px           │      │  │
│  │  │                          │      │  │
│  │  └──────────────────────────┘      │  │
│  │                                    │  │
│  │  [クリア]        [サイン完了]        │  │
│  ├────────────────────────────────────┤  │
│  │  ※ デバイスを元請担当者にお渡し      │  │
│  │    ください                         │  │
│  │  ※ サイン後「サイン完了」を押して     │  │
│  │    ください                         │  │
│  └────────────────────────────────────┘  │
│  （背景：半透明の黒オーバーレイ）          │
└──────────────────────────────────────────┘
```

処理フロー：
1. モーダル内に react-signature-canvas で描画エリアを表示
2. タッチ操作中はページスクロールを無効化（`touch-action: none`）
3. モーダル外タップでは閉じない（誤操作防止）
4. 「クリア」ボタンで描画をリセット
5. 「サイン完了」ボタン押下時：
   - Canvas を PNG 画像に変換（`toDataURL('image/png')`）
   - Firebase Storage にアップロード（パス：`signatures/{companyId}/{reportId}/{timestamp}.png`）
   - Firestore の日報ドキュメントを更新：
     - `clientSignature.imageUrl` = ダウンロードURL
     - `clientSignature.signedAt` = 現在時刻
     - `status` = `signed`
   - モーダルを閉じる
   - **日報上部の元請確認欄にサイン画像が即座に表示される**
   - 画面下部のボタンが「送信する」に切り替わる
6. 空白のまま「サイン完了」は押せないようにバリデーション（`isEmpty()` チェック）
7. 「✕」ボタン → 確認ダイアログ「サインを中断しますか？」→ はい：モーダルを閉じて `draft` のまま

**サイン完了後の日報作成画面の変化：**

```
┌──────────────────────────────────────────┐
│  作業日報                                 │
├──────────────────────────────────────────┤
│  ┌─ 元請確認欄 ─────────────────────┐    │
│  │ [✅ サイン画像がここに表示される]   │    │
│  │ 署名日時：2025/01/31 17:30        │    │
│  │          [サインをやり直す]         │    │
│  └──────────────────────────────────┘    │
│                                          │
│  （以下、日報の内容 ...）                  │
│                                          │
├──────────────────────────────────────────┤
│  この日報を送信しますか？                   │
│  [あとで送信する]        [送信する]         │
└──────────────────────────────────────────┘
```

- 「送信する」→ ステータスを `submitted` に更新、`submittedAt` を記録 → ホームへ遷移
- 「あとで送信する」→ `signed` のままホームへ遷移
- 「サインをやり直す」→ 前のサイン画像をStorageから削除 → サインモーダルを再表示 → ステータスは `draft` に戻る

---

## 7. オフライン対応

### 7-1. 基本方針

- 日報データは送信完了（`submitted`）までローカルに保持する
- 送信完了後はローカルデータを削除する
- オフライン時でも日報の入力・下書き保存は可能にする

### 7-2. 実装方法

- **localStorage** または **IndexedDB** に下書きデータを保存
- オンライン復帰時にFirestoreへ同期
- PWAの Service Worker でアプリ本体のキャッシュを管理し、オフラインでもアプリが起動できるようにする

### 7-3. 同期フロー

```
[入力・保存]
    │
    ├─ オンライン → Firestoreに即時保存 + ローカル保存
    │
    └─ オフライン → ローカルのみ保存
                        │
                        │ オンライン復帰検知
                        ▼
                    Firestoreに同期保存
```

### 7-4. 送信完了後の削除

```javascript
// 送信成功後
await updateDoc(reportRef, { status: 'submitted', submittedAt: serverTimestamp() });
localStorage.removeItem(`draft_${reportId}`); // ローカルデータ削除
```

---

## 8. 通知機能

### 8-1. 通知種別

| 通知 | 条件 | タイミング |
|------|------|-----------|
| 日報未提出リマインダー | 当日の日報が未作成、`draft`、または `signed` | 企業・現場ごとに設定した時刻 |
| 差戻し通知 | ステータスが `rejected` に変更された時 | 即時 |

### 8-2. 通知スケジュールの設定

通知タイミングは**企業単位**および**現場単位**で個別設定できるようにする。現場単位の設定がある場合は現場設定を優先し、なければ企業のデフォルト設定を適用する。

#### Firestore データモデル（追加）

**企業レベルのデフォルト設定** — `companies/{companyId}` に追加：

```
companies/{companyId}
└── notificationSettings: {
        reminderTimes: array<string>   // 通知時刻リスト（例：["17:00", "20:00"]）
        enabled: boolean               // 通知の有効/無効
    }
```

**現場レベルの個別設定（オプション）** — `sites/{siteId}` に追加：

```
sites/{siteId}
└── notificationSettings: {            // 未設定の場合は企業デフォルトを適用
        reminderTimes: array<string>   // この現場専用の通知時刻
        enabled: boolean
    }
```

#### 設定画面（管理画面側 — labor-admin で対応）

- 企業設定画面（自社情報設定）に「日報リマインダー通知」セクションを追加
  - 通知ON/OFF切り替え
  - 通知時刻の追加・削除（複数時刻設定可能）
- 現場管理の編集画面に「通知設定（個別）」セクションを追加
  - 「企業デフォルトを使用」チェックボックス（デフォルトON）
  - OFF にした場合、この現場専用の通知時刻を設定可能

#### 適用ルール

```
現場に notificationSettings が設定されている
  → 現場の設定を適用
現場に notificationSettings が未設定
  → 企業の notificationSettings を適用
企業にも未設定
  → 通知なし
```

### 8-3. 実装方法

- **Firebase Cloud Messaging（FCM）** でプッシュ通知を送信
- **Cloud Functions（スケジュール実行）** で定期チェック（例：15分おきに実行）
  - 実行時に全企業・全現場の `notificationSettings.reminderTimes` を参照
  - 現在時刻に該当する通知設定があれば、対象の未提出者にプッシュ通知を送信
  - 対象ユーザー：`role` が日報作成権限を持つユーザー
  - 対象日報：当日分で `status` が `draft` / `signed` / 未作成のもの
- PWAの通知許可をユーザーに求める（初回起動時）

### 8-4. カスタム通知機能

管理画面（labor-admin）から、任意の時刻に任意のメッセージを通知できる機能。企業単位・現場単位で個別設定可能。

#### ユースケース例

| 企業 | 現場 | 時刻 | メッセージ |
|------|------|------|-----------|
| 企業A | 現場A | 12:00 | お昼休憩の時間です |
| 企業A | 現場B | 14:00 | お昼休憩の時間です |
| 企業B | （なし） | — | カスタム通知なし |
| 企業C | （全社共通） | 11:00 | お昼休憩なしの通知 |

#### Firestore データモデル

**カスタム通知コレクション** — `customNotifications/{notificationId}`：

```
customNotifications/{notificationId}
│
├── companyId: string              // 対象企業ID
├── siteId: string | null          // 対象現場ID（nullなら企業全体）
├── siteName: string | null        // 現場名（表示用・非正規化）
│
├── time: string                   // 通知時刻（"12:00" 形式）
├── message: string                // 通知メッセージ（自由入力）
│
├── targetRoles: array<string>     // 通知対象の権限（["user", "manager"] 等）
│
├── repeat: string                 // 繰り返し設定
│   // "daily"       = 毎日
│   // "weekdays"    = 平日のみ（月〜金）
│   // "custom"      = 曜日指定
│
├── customDays: array<number> | null  // repeat="custom" 時の曜日（0=日, 1=月, ..., 6=土）
│
├── enabled: boolean               // 有効/無効
├── createdBy: string              // 作成者のユーザーID
├── createdAt: timestamp
└── updatedAt: timestamp
```

#### スコープ（対象範囲）の判定ルール

```
siteId が指定されている
  → その現場に所属するユーザーのみに通知

siteId が null
  → その企業（companyId）の全ユーザーに通知
```

#### 管理画面（labor-admin）の設定UI

カスタム通知の管理画面は、自社情報設定 or 現場管理の中に配置する。

**一覧画面：**
```
┌──────────────────────────────────────────────────┐
│  カスタム通知設定                    [＋ 新規追加]  │
├──────┬──────┬──────────────────┬────┬─────────┤
│ 対象  │ 時刻  │ メッセージ        │繰返│ 有効    │
├──────┼──────┼──────────────────┼────┼─────────┤
│全社   │11:00 │お昼休憩なしの通知  │毎日│ [ON/OFF]│
│現場A  │12:00 │お昼休憩の時間です  │平日│ [ON/OFF]│
│現場B  │14:00 │お昼休憩の時間です  │平日│ [ON/OFF]│
└──────┴──────┴──────────────────┴────┴─────────┘
```

**新規作成・編集フォーム：**
```
┌──────────────────────────────────────────┐
│  カスタム通知の設定                        │
├──────────────────────────────────────────┤
│  対象：                                  │
│  ○ 全社共通                              │
│  ○ 現場指定 → [現場セレクトボックス]       │
│                                          │
│  通知時刻：[TimePicker]                   │
│                                          │
│  メッセージ：                             │
│  [自由入力テキストエリア]                   │
│                                          │
│  繰り返し：                               │
│  ○ 毎日  ○ 平日のみ  ○ 曜日指定          │
│  （曜日指定の場合）                        │
│  □月 □火 □水 □木 □金 □土 □日            │
│                                          │
│  通知対象：                               │
│  ☑ 一般ユーザー  ☑ 管理者                 │
│                                          │
│  [キャンセル]              [保存]          │
└──────────────────────────────────────────┘
```

#### Cloud Functions（カスタム通知の送信処理）

日報リマインダーと同一のスケジュール関数内で処理する。

```javascript
// functions/index.js（概略）
exports.scheduledNotifications = onSchedule("every 15 minutes", async (event) => {
  const now = new Date();
  const currentHHMM = formatToHHMM(now);
  const currentDayOfWeek = now.getDay(); // 0=日, 1=月, ..., 6=土

  // === 1. 日報未提出リマインダー ===
  // （既存の8-3の処理）

  // === 2. カスタム通知 ===
  // a. enabled=true かつ time が現在時刻 ±7分 の通知を取得
  const notifications = await db.collection('customNotifications')
    .where('enabled', '==', true)
    .get();

  for (const doc of notifications.docs) {
    const data = doc.data();

    // b. 時刻チェック（±7分の窓）
    if (!isWithinTimeWindow(data.time, currentHHMM, 7)) continue;

    // c. 繰り返し条件チェック
    if (data.repeat === 'weekdays' && (currentDayOfWeek === 0 || currentDayOfWeek === 6)) continue;
    if (data.repeat === 'custom' && !data.customDays.includes(currentDayOfWeek)) continue;

    // d. 対象ユーザーを特定
    //    - siteId指定あり → その現場の担当ユーザー
    //    - siteId=null → companyId全体のユーザー
    //    - targetRolesでフィルタ

    // e. FCMで通知送信（data.message をそのまま送信）
  }
});
```

> **注意**: カスタム通知はCloud Functionsに依存するため、日報リマインダーと同様にPhase Cでの実装とする。管理画面の設定UIは先に作成しておき、Firestoreにデータを保存する部分まではPhase Aで対応可能。

### 8-5. Cloud Functions（統合スケジュール処理 — 概要）

```javascript
// functions/index.js（概略）
exports.scheduledNotifications = onSchedule("every 15 minutes", async (event) => {
  const now = new Date();
  const currentHHMM = formatToHHMM(now); // "17:00" 形式
  const currentDayOfWeek = now.getDay(); // 0=日, 1=月, ..., 6=土
  // ±7分の時間窓で判定（15分間隔実行のため）

  // === 1. 日報未提出リマインダー ===
  // a. 全企業の notificationSettings を取得
  // b. 各企業の現場ごとに notificationSettings を確認（現場設定優先）
  // c. 現在時刻に該当する reminderTimes があれば:
  //    - 今日の日付で statusがsubmitted/approved以外の日報を検索
  //    - 日報が存在しないユーザーも含めて未提出者を特定
  //    - FCMトークンを取得してプッシュ通知送信

  // === 2. カスタム通知 ===
  // a. customNotifications コレクションから enabled=true を取得
  // b. 時刻・曜日条件が一致するものをフィルタ
  // c. 対象ユーザーを特定（企業全体 or 現場指定）
  // d. FCMで message を送信
});
```

> **注意**: Cloud Functions は初期リリースでは後回しにしても良い。まずはアプリ本体の完成を優先し、通知機能はPhase Cとして追加する形でもOK。その場合でも、Firestoreの `notificationSettings` フィールドおよび `customNotifications` コレクションの構造は先に定義しておくと後からスムーズに実装できる。

---

## 9. 認証・権限

### 9-1. ログイン

- Firebase Authentication のメール/パスワード認証を使用
- 管理画面（labor-admin）と同一の認証基盤を共有
- ログイン後、`users` コレクションからユーザー情報を取得：
  - `companyId`：所属企業（データのフィルターに使用）
  - `role`：権限（admin / manager / user）
  - `employeeId`：紐付く社員ID
  - `displayName`：表示名

### 9-2. アクセス制御

- 日報アプリにアクセスできるのは `role` が `user` / `manager` / `admin` のいずれか
- 日報の閲覧・編集は自分が作成したもの（`createdBy == 自分のUID`）のみ
- 他のユーザーの日報は閲覧不可（管理画面でのみ閲覧可能）

### 9-3. Firestore セキュリティルール（日報関連の追加分）

```javascript
match /dailyReports/{reportId} {
  // 読み取り：自分が作成した日報、またはadmin/manager
  allow read: if request.auth != null && (
    resource.data.createdBy == request.auth.uid ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']
  );

  // 作成：認証済みユーザー
  allow create: if request.auth != null;

  // 更新：作成者本人（draft/signed/rejectedのみ）、またはadmin（承認操作）
  allow update: if request.auth != null && (
    (resource.data.createdBy == request.auth.uid &&
     resource.data.status in ['draft', 'signed', 'rejected']) ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
  );

  // 削除：adminのみ
  allow delete: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

match /customNotifications/{notificationId} {
  // 読み取り：同一企業のadmin/manager
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];

  // 作成・更新・削除：adminのみ（管理画面から操作）
  allow create, update, delete: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

---

## 10. UIデザイン方針

### 10-1. デザインシステム

- **Tailwind CSS** を使用
- モバイルファーストのレスポンシブデザイン
- 最小タップターゲット：44×44px（Apple HIG準拠）
- フォントサイズ：本文16px以上（モバイルでの可読性確保）

### 10-2. カラー

| 用途 | 色 | Tailwind |
|------|-----|---------|
| プライマリ | 青 | `blue-600` |
| 成功・承認済み | 緑 | `green-600` |
| 警告・サイン済み | 黄 | `yellow-500` |
| エラー・差戻し | 赤 | `red-600` |
| 下書き | グレー | `gray-400` |
| 送信完了 | 青 | `blue-500` |

### 10-3. ステータスバッジ

```jsx
const statusConfig = {
  draft:     { label: '下書き',     color: 'bg-gray-100 text-gray-600' },
  signed:    { label: 'サイン済み', color: 'bg-yellow-100 text-yellow-700' },
  submitted: { label: '送信完了',   color: 'bg-blue-100 text-blue-700' },
  approved:  { label: '承認済み',   color: 'bg-green-100 text-green-700' },
  rejected:  { label: '差戻し',     color: 'bg-red-100 text-red-700' },
};
```

---

## 11. PWA設定

### 11-1. manifest.json

```json
{
  "name": "作業日報アプリ -CDS-",
  "short_name": "日報",
  "description": "建設現場の作業日報を入力・送信するアプリ",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 11-2. Service Worker

- vite-plugin-pwa で自動生成
- アプリシェル（HTML/CSS/JS）をキャッシュ
- APIリクエスト（Firestore）はネットワーク優先、フォールバックでキャッシュ

---

## 12. ディレクトリ構成

```
daily-report-app/
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx          // アプリヘッダー
│   │   │   ├── StatusBadge.jsx     // ステータスバッジ
│   │   │   ├── LoadingSpinner.jsx  // ローディング表示
│   │   │   └── ErrorMessage.jsx    // エラー表示
│   │   ├── report/
│   │   │   ├── ReportForm.jsx      // 日報入力フォーム
│   │   │   ├── WorkerRow.jsx       // 作業員1行の入力
│   │   │   ├── SignatureModal.jsx   // 元請サインモーダル（オーバーレイ）
│   │   │   ├── SignatureDisplay.jsx // 元請確認欄（日報上部に表示）
│   │   │   ├── ReportCard.jsx      // 一覧のカード表示
│   │   │   └── ReportDetail.jsx    // 詳細表示
│   │   └── auth/
│   │       └── ProtectedRoute.jsx  // 認証ガード
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── HomePage.jsx            // 日報一覧
│   │   ├── ReportNewPage.jsx       // 日報作成（サインモーダル含む）
│   │   ├── ReportEditPage.jsx      // 日報編集（サインモーダル含む）
│   │   └── ReportDetailPage.jsx    // 日報詳細
│   ├── hooks/
│   │   ├── useAuth.js              // 認証フック
│   │   ├── useReports.js           // 日報データ取得
│   │   ├── useEmployees.js         // 社員リスト取得
│   │   ├── useSites.js             // 現場リスト取得
│   │   └── useOfflineStorage.js    // オフライン保存
│   ├── contexts/
│   │   └── AuthContext.jsx         // 認証コンテキスト
│   ├── utils/
│   │   ├── dateUtils.js            // 日付ヘルパー
│   │   ├── storageUtils.js         // ローカルストレージ操作
│   │   └── validationUtils.js      // バリデーション
│   ├── firebase.js                 // Firebase初期化
│   ├── App.jsx                     // ルーティング定義
│   ├── main.jsx                    // エントリーポイント
│   └── index.css                   // Tailwind読み込み
├── .env                            // 環境変数（gitignore）
├── .env.example                    // 環境変数テンプレート
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 13. 開発優先順位

### Phase A（MVP — まず動くものを作る）

1. プロジェクトセットアップ（Vite + React + Tailwind + Firebase接続）
2. ログイン画面・認証フロー
3. ホーム画面（日報一覧）
4. 日報作成画面（フォーム入力 + Firestore保存）
5. 日報編集画面
6. 日報詳細画面

### Phase B（コア機能の完成）

7. 元請サイン画面（react-signature-canvas + Firebase Storage）
8. ステータス遷移（draft → signed → submitted）
9. オフライン対応（ローカル保存 + 同期）
10. PWA設定（manifest + Service Worker）

### Phase C（通知・仕上げ）

11. Firebase Cloud Messaging 連携
12. Cloud Functions（未提出リマインダー）
13. 差戻し通知
14. UIの微調整・アニメーション
15. テスト・バグ修正

---

## 14. 注意事項・制約

- **既存の管理画面のFirestoreコレクション構造を変更しないこと** — 日報アプリは既存コレクションを読み取り専用で参照し、新規の `dailyReports` コレクションのみ追加する
- **環境変数はハードコーディングしない** — すべて `.env` と `import.meta.env` で管理
- **直筆サインのCanvas描画中はページスクロールを必ず無効化する** — `touch-action: none` の設定が必須
- **日付はすべて JST（日本標準時）を前提とする** — Firestoreの timestamp はUTCで保存されるため、表示時にJSTに変換すること
- **モバイルファーストで実装する** — PC表示はしなくてよいが、タブレット（iPad等）での表示は考慮する
