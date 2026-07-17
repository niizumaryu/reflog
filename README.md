# REFLOG

バスケットボール審判のための試合記録アプリ。Next.js (App Router) + Supabase 製の PWA です。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabase プロジェクトを作成する

1. [supabase.com](https://supabase.com) でアカウントを作成し、新規プロジェクトを作成します。
2. Supabase ダッシュボードの **Project Settings > API** から以下を控えます。
   - `Project URL`
   - `anon public` キー
   - `service_role` キー(サーバー専用。**絶対に公開しない**)

### 3. データベース / Storage を構築する

Supabase ダッシュボードの **SQL Editor** を開き、[`supabase/schema.sql`](supabase/schema.sql) の内容をそのまま貼り付けて実行してください。何度実行しても安全(冪等)です。以下が作成・更新されます。

- `profiles` テーブル(ユーザー名・表示名・都道府県・審判級・活動カテゴリー・審判歴・アイコン情報)+ RLS ポリシー
  - `username` は一意(未設定の間は `NULL` を許可し、アプリ側の入力必須チェックと組み合わせています)
- `matches` テーブル(試合記録)+ RLS ポリシー(自分のデータのみ読み書き可能)
- `annual_goals` テーブル(年別の目標試合数)+ RLS ポリシー(自分のデータのみ読み書き可能)
- 新規ユーザー登録時に `profiles` 行を自動作成するトリガー
- **Storage バケット `profile-icons`**(公開読み取り・5MBまで・JPG/PNGのみ)+ 「自分のフォルダ(`{user_id}/...`)にのみアップロード・更新・削除できる」RLS ポリシー

ダッシュボードで手動作成する手順は不要です。SQL 実行だけで Storage バケットと RLS ポリシーまで含めて構築されます。

### 4. Google ログインを有効化する(任意)

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth クライアント ID を作成します。
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクト URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Supabase ダッシュボードの **Authentication > Providers > Google** を開き、有効化して Client ID / Client Secret を設定します。
3. **Authentication > URL Configuration** で以下を設定します。
   - Site URL: `http://localhost:3000`(本番では実際のドメイン)
   - Redirect URLs に `http://localhost:3000/auth/callback` と本番ドメインの `/auth/callback` を追加

メールログインのみで使う場合、この手順はスキップして構いません(ホーム画面には「Googleでログイン」ボタンが表示されますが、Providerを有効化するまではエラーになります)。

### 5. 環境変数を設定する

`.env.local.example` をコピーして `.env.local` を作成し、値を入力します。

```bash
cp .env.local.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. 開発サーバーを起動する

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと `/login` にリダイレクトされます(ログイン必須)。

## 主な機能

- **認証**: Google ログイン / メールログイン(新規登録・パスワードリセット含む) — [`src/app/login`](src/app/login)、[`src/app/reset-password`](src/app/reset-password)、[`src/app/update-password`](src/app/update-password)
- **試合記録**: 記録・一覧・詳細・削除。すべて Supabase の `matches` テーブルに保存され、複数端末で自動的に同期されます — [`src/lib/matches.ts`](src/lib/matches.ts)
- **ローカルデータの移行**: Version 0.1/0.2 で `localStorage` に保存されていた記録は、初回ログイン時に自動で Supabase へ移行されます — [`src/lib/migration.ts`](src/lib/migration.ts)
- **ダッシュボード**: 今月/今年の試合数、担当ポジション別回数、自己評価平均、最近の記録、課題キーワード — [`src/app/dashboard`](src/app/dashboard)
- **AI振り返り(ルールベース)**: 記録内容からキーワードを検出して簡易フィードバックを表示。将来 OpenAI 等の実 API に差し替えやすいよう関数を分離しています — [`src/lib/aiReflection.ts`](src/lib/aiReflection.ts)
- **CSV出力**: UTF-8 BOM付きでExcelでも文字化けせずに開けます — [`src/lib/csv.ts`](src/lib/csv.ts)
- **プロフィール/設定**: ユーザー名(必須・一意)・表示名・アイコン(デフォルト10種 or 画像アップロード)・都道府県・審判級・活動カテゴリー・審判歴の編集、データエクスポート — [`src/app/settings`](src/app/settings)
- **初回ログイン時のプロフィール誘導**: ユーザー名が未設定のアカウントは、どのページにアクセスしてもプロフィール設定画面へ誘導されます — [`src/components/ProfileGuard.tsx`](src/components/ProfileGuard.tsx)
- **プロフィールアイコン**: バスケットボール関連のデフォルトアイコン10種から選択、または JPG/PNG(5MBまで)を Supabase Storage(`profile-icons` バケット)にアップロードして使用できます — [`src/components/AvatarIcons.tsx`](src/components/AvatarIcons.tsx)
- **PWA**: ホーム画面に追加してアプリのように起動可能。manifest / service worker / アイコンを実装済み — [`src/app/manifest.ts`](src/app/manifest.ts)、[`public/sw.js`](public/sw.js)
- **年間レポート**: 年を選んで、年間担当試合数・主審/副審/未設定の内訳・自己評価平均・活動月数・年間目標と達成率・年間目標達成ペース・月別試合数・担当ポジション割合・カテゴリー別集計・自己評価推移(月別数値付き)・前年比較・今年のハイライト(最多カテゴリー/最多課題キーワード/主審割合/活動月数)・よく出る課題キーワード・ルールベースの年間コメント・AI年間分析を表示。トップ画面/ダッシュボード/設定画面から遷移できます — [`src/app/report`](src/app/report)、集計ロジックは [`src/lib/annualReport.ts`](src/lib/annualReport.ts)
- **審判成長グラフ**: 月別試合数(棒グラフ)・月別自己評価(折れ線グラフ)・担当ポジション割合(円グラフ)・年間目標達成ペース(累計実績 vs 目標ペースの折れ線)・前年比較(棒グラフ)を [Recharts](https://recharts.org/) で描画。すべて黒背景×オレンジ基調、レスポンシブ対応、ホバーでツールチップ表示 — [`src/components/charts`](src/components/charts)
- **年間目標**: 年間レポート画面で目標試合数を設定できます(初期値100試合)。達成率をプログレスバーで表示し、年ごとに `annual_goals` テーブルに保存されます — [`src/lib/annualGoals.ts`](src/lib/annualGoals.ts)

## 年間レポートのPDF出力

年間レポート画面右上の「PDF出力」ボタンで、表示中のレポートをそのまま PDF としてダウンロードできます。年間目標・達成率・前年比較・今年のハイライトも含め、画面に表示されているセクションはすべて PDF に含まれます(目標変更用の入力欄など、編集専用の操作パーツのみ `pdf-hide` クラスで除外されます)。

- 実装は [`src/lib/pdfExport.ts`](src/lib/pdfExport.ts)。レポート部分の DOM を [`html-to-image`](https://github.com/bubkoo/html-to-image) でキャンバスに描画し、[`jspdf`](https://github.com/parallax/jsPDF) で A4 サイズの PDF に貼り付けます(縦に長い場合は自動で複数ページに分割)。
- 日本語をブラウザが実際にレンダリングした状態をそのまま画像化するため、PDF用の日本語フォント埋め込みが不要で、文字化けが起きません。
- どちらのライブラリも PDF 出力ボタンを押したときに動的 import されるため、通常のページ読み込みには影響しません。
- ダウンロードは `<a download>` によるものなので、スマートフォンのブラウザでも保存できます。
- ファイル名は `reflog-report-{年}.pdf`(例: `reflog-report-2026.pdf`)。

## AI動画分析(デモ基盤)

`/video-analysis` から、試合動画をアップロードして解析する機能の**基盤**を追加しました。**重要: これは完成した商用AI機能ではなく、将来の実解析に向けた土台です。**

### 実際に動いている部分(本物)

- 動画アップロード: ブラウザから Supabase Storage の非公開バケット `match-videos` へ直接アップロードし、RLSでアップロード者本人のみアクセスできます — [`src/lib/video-analysis/upload.ts`](src/lib/video-analysis/upload.ts)
- 動画メタデータ抽出: 動画の長さ・解像度を実際に読み取ります — [`src/lib/video-analysis/qualityMetrics.ts`](src/lib/video-analysis/qualityMetrics.ts)
- 映像品質チェック: ブラウザの Canvas で実際に複数フレームをサンプリングし、明るさ・暗いフレームの割合・シャープさの参考値などを計算した上で、品質が著しく低い場合は「判定不能」として以降の解析を行いません(`quality_tier = insufficient`)
- 解析ステータスの管理: `video_analyses.status`(uploaded → analyzing → completed / completed_insufficient_quality / failed)と `progress` は実際のパイプライン処理の進行に合わせて更新されます — [`src/lib/video-analysis/pipeline.ts`](src/lib/video-analysis/pipeline.ts)、[`src/app/api/video-analysis/[id]/analyze/route.ts`](src/app/api/video-analysis/%5Bid%5D/analyze/route.ts)
  - 許可された状態遷移は [`src/lib/video-analysis/statusMachine.ts`](src/lib/video-analysis/statusMachine.ts) に一箇所にまとめてあり、さらに **DBトリガー** (`enforce_video_analysis_status_transition`) が同じ遷移ルールを強制します。ログイン中の本人がブラウザから直接 `status` を `completed` 等へ書き換えようとしても、正規の遷移(`uploaded/failed → analyzing → completed` 等)以外は拒否されます。
- 所有権保護: 新規テーブル(`video_analyses`・`analysis_quality_metrics`・`analysis_events`・`coaching_results`・`analysis_feedback`)はすべて RLS で本人のみ閲覧・編集・削除可能です
  - 加えて **DBトリガー** (`enforce_video_analysis_ownership`)が、子テーブル(`analysis_quality_metrics`・`analysis_events`・`coaching_results`・`analysis_feedback`)へ挿入する行の `video_analysis_id` が実際に自分の `video_analyses` 行を指しているかを検証します。RLSは行自体の所有者しかチェックしないため、これがないと理論上「自分の行として、他人の解析IDを参照する子データ」を挿入できてしまう隙があり、それを塞いでいます。
- 削除: 動画削除は Storage → DB の順で削除し、Storageの削除に失敗した場合は何も削除されず安全に再試行できます。Storage削除後にDB削除だけ失敗した場合は、その旨を明示したエラーメッセージを表示します(不整合を隠しません)。

### まだ実装していない部分(デモ表示)

- コート検出・選手/審判検出・ボール検出・プレー場面検出・審判へのコーチング内容は、**実際のコンピュータービジョンAIモデルによる解析ではありません**。すべて `is_demo = true` が付き、UI上にも「デモ解析パイプライン」の注意書きが常時表示されます — [`src/lib/video-analysis/mockAdapters.ts`](src/lib/video-analysis/mockAdapters.ts)
- どの結果も「確定した判定」ではなく、根拠・信頼度・不確実な理由・別の解釈の可能性・不足しているデータ・人間による確認推奨を必ず添えて表示します(`EvidentiaryFields`) — [`src/lib/video-analysis/types.ts`](src/lib/video-analysis/types.ts)
- 将来、実際の検出モデルを統合する際は `CourtDetector` / `PersonDetector` / `BallDetector` / `EventDetector` / `RefereeCoachEngine` インターフェースを実装したクラスを作成し、`src/lib/video-analysis/pipeline.ts` の呼び出し先を差し替えるだけで済むように設計しています(呼び出し側のコード変更は不要)

### 制限・今後の課題

- アップロードは 300MB / 15分までです(`src/lib/video-analysis/constants.ts`)。Supabase プロジェクト側のアップロードサイズ上限設定によっては、これより厳しい制限がかかる場合があります。
- 非同期ジョブキュー(`analysis_jobs`)やフレーム単位の追跡データ保存(`analysis_tracks`)はまだ実装していません。今回はモック解析が同期的に完結するため、ステータス/進捗は `video_analyses` テーブルに直接持たせています。将来リアルタイムの重い解析を非同期ワーカーで実行する際に、あらためて設計・追加してください。
- 複数カメラの同期、姿勢推定、ボール軌道追跡、コート座標変換などは未実装です。
- アップロード完了前にブラウザを閉じた場合など、動画ファイルが存在しないまま `uploaded`/`analyzing` の記録だけが残る「孤立レコード」を自動的に片付ける仕組み(定期cleanupジョブ等)はまだありません。将来 `src/app/api/cron` と同様の仕組みで、一定時間以上進行のない記録を `failed` にする、または削除するバッチを追加することを推奨します。
- 単体テスト(Vitest)は、DOM/ネットワークに依存しない純粋なロジック(バリデーション・品質判定・状態遷移ルール)のみを対象にしています。RLSやトリガーを含む結合テストは、ローカルSupabaseスタック(`supabase start`)が必要なため今回は実行していません。UIコンポーネントの自動テストも未整備です。

### セットアップに必要な作業

新しいテーブルと Storage バケットは、**独立したマイグレーションファイル** [`supabase/migrations/20260716_add_video_analysis.sql`](supabase/migrations/20260716_add_video_analysis.sql) にまとまっています。`supabase/schema.sql` の全文を再実行する必要はありません。

1. Supabase ダッシュボードを開く
2. 左メニューの **SQL Editor** を開く
3. **New query** を押す
4. [`supabase/migrations/20260716_add_video_analysis.sql`](supabase/migrations/20260716_add_video_analysis.sql) の内容を全文コピーする
5. SQL Editor に貼り付ける
6. **Run** を押す
7. 「Success. No rows returned」等の成功表示を確認する
8. REFLOGにログインし、`/video-analysis` から動作確認する

冪等なマイグレーションなので、何度実行しても安全です。既存のテーブル・データ・RLSポリシーへの影響はありません。新しい環境変数は不要です(外部AI APIを一切呼び出していないため)。

#### 開発環境での確認方法

マイグレーションが適用されたかどうかは、ブラウザや `curl` から匿名キーで REST エンドポイントを直接叩くと確認できます(自分のデータは返りませんが、テーブルの有無だけ分かります)。

```bash
curl -s "https://<your-project-ref>.supabase.co/rest/v1/video_analyses?select=id&limit=1" \
  -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <NEXT_PUBLIC_SUPABASE_ANON_KEY>"
```

- マイグレーション未適用: `{"code":"PGRST205", ... "Could not find the table 'public.video_analyses'" ...}` が返ります。
- マイグレーション適用済み: `[]`(未ログイン扱いのためRLSで空配列)が返ります。

同様に `.../storage/v1/bucket/match-videos` へのリクエストが `Bucket not found` から通常のバケット情報に変われば、Storage側の設定も反映されています。

## 認証まわりのアーキテクチャ

- `src/proxy.ts` — Next.js 16 の Proxy(旧 Middleware)。未ログインで保護ページにアクセスすると `/login` にリダイレクトします。
- `src/lib/supabase/client.ts` — ブラウザ用 Supabase クライアント。
- `src/lib/supabase/server.ts` — Server Component / Route Handler 用(Cookie ベースのセッション)。
- `src/lib/supabase/admin.ts` — `service_role` キーを使うサーバー専用クライアント。アカウント削除 API (`src/app/api/account/delete/route.ts`) からのみ使用します。
- `src/components/AuthProvider.tsx` — セッション状態を保持し、ログイン検知時にローカルデータ移行を1回だけ実行します。

## アカウント削除について

設定画面に「アカウントを削除する」ボタンがありますが、**現時点では確認ダイアログ+案内メッセージのみで、実際の削除処理は行いません**(UIのみ)。

将来削除処理を有効化する際は、`profiles` と `matches` テーブルが `auth.users` への外部キーに `on delete cascade` を設定済みなので、`supabase.auth.admin.deleteUser()` を呼ぶだけで関連データもまとめて削除できます。この呼び出しには `service_role` キーが必要なため、クライアントから直接実行せず `src/app/api/account/delete/route.ts` (サーバー専用の Route Handler、実装済み・未接続)経由で行う設計です。

## スクリプト

```bash
npm run dev      # 開発サーバー
npm run build    # 本番ビルド
npm run lint     # ESLint
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
