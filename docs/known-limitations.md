# 既知の制限事項

REFLOGを一般公開・課金導入する前に、開発チーム・運営者が正確に理解しておくべき「まだ本物ではない」「まだ実装されていない」部分をまとめます。ユーザー向けの説明(利用規約・プライバシーポリシー・アプリ内表示)と食い違いがないよう、この文書を更新の起点にしてください。

## 1. 動画分析は「本物の競技AI判定」ではない

`/video-analysis` のコート検出・選手/審判検出・ボール検出・プレー場面検出・審判へのコーチング内容は、**実際のコンピュータービジョンAIモデルによる解析ではありません**。`src/lib/video-analysis/mockAdapters.ts` が生成するデモ/シミュレーション出力で、すべての行に `is_demo = true` が付与され、UI にも [`DemoDisclaimerBanner`](../src/components/video-analysis/DemoDisclaimerBanner.tsx) が常時表示されます。

実際に動いている部分(本物)は以下のみです。

- 動画アップロードと非公開Storageへの保存
- 動画の長さ・解像度・推定フレームレートの実測(ブラウザ側で読み取り)
- Canvasによる実フレームサンプリングを使った映像品質判定(明るさ・暗いフレーム比率・シャープさ参考値)

将来、本物の検出モデルを統合する際は `CourtDetector` / `PersonDetector` / `BallDetector` / `EventDetector` / `RefereeCoachEngine` インターフェース(`src/lib/video-analysis/types.ts`)を実装したクラスに差し替えるだけで済むように設計されています。**今回の監査でもこの部分の実装追加は行っていません**(指示によりデモ実装のまま維持)。

## 2. 本番Supabaseへのmigration適用状況はコードだけでは断定できない

このリポジトリの `supabase/schema.sql` と `supabase/migrations/*.sql` は「ローカルのコードとしてこう定義されている」ことを示すだけで、**実際にどのSupabaseプロジェクトに、いつ、どの内容が適用されたかはコードから判定できません**。本番プロジェクトのSQL Editor履歴、または `supabase migration list` 等で必ず個別に確認してください。詳細な確認手順は [`docs/supabase-production-verification.md`](./supabase-production-verification.md) を参照してください。

今回の監査で追加した `supabase/migrations/20260717_secure_function_search_path.sql` も同様に、**本番へは未適用**です。

## 3. Web Push通知であり、メール通知ではない

REFLOGの通知機能は、ブラウザの **Web Push API**(`src/lib/notifications/push.ts`、`public/sw.js`)を使ったプッシュ通知です。**メール送信機能は実装されていません。** SMTP/メール配信サービス(SendGrid等)との連携コードは存在しません。

- 通知はブラウザ・OSの通知許可が必要で、対応ブラウザ(Chrome/Edge/Firefox、iOSはSafari 16.4以降でホーム画面追加時のみ等)や通知許可設定に依存します。
- パスワード再設定メール・メール確認メールは Supabase Auth 標準機能として送信されますが、これは認証基盤(Supabase)が送るものであり、アプリ独自の「メール通知」機能ではありません。
- アプリ内のUI・ドキュメントで「メール通知」という表現がないか、今回の監査で確認済みです(該当なし)。今後この文言を追加する場合は、実装(Web PushかSMTP経由メールか)と必ず一致させてください。

## 4. 課金は未実装

Stripe・PayPay等の決済プロバイダとの連携コードは存在しません。`profiles.plan_type`(free/pro/admin)と `plan_limits` テーブルは動画分析の**月間利用回数の上限**を管理するための土台であり、実際の課金・サブスクリプション処理とは接続されていません。`pro` プランへの変更は、現状Supabase SQL Editorから手動でUPDATEする以外に方法がありません(アプリ内に決済導線はありません)。

## 5. Apple / Google ストア配信は未対応

REFLOGはPWA(Webアプリ)として実装されており、Next.jsの `manifest.ts` とService Worker(`public/sw.js`)によりホーム画面への追加・オフライン閲覧の一部に対応しています。しかし、**App Store / Google Play へのネイティブアプリとしての申請・配信は行っていません**。ストア配信する場合は、Capacitor等でのラップ、審査情報・スクリーンショット・プライバシー表示の登録など別途の作業が必要です(`docs/release-checklist.md` に該当項目があります)。

## 6. 法的文書は専門家未確認の一般的なドラフトである

`/terms`(利用規約)・`/privacy`(プライバシーポリシー)は、実装内容(Supabase・Web Push・動画Storage・Cookie利用等)と整合するように作成した一般的なドラフトです。**弁護士等の専門家によるレビューは受けていません。** 本番公開・課金導入前に、必ず専門家の確認を受けてください。特に以下は運営者側で個別に判断・記入が必要です。

- 事業者としての正式名称・所在地・連絡先(特定商取引法に基づく表示が必要になるのは、有償販売を開始する場合です。今回は課金未実装のため、当該表示ページ自体を追加していません。実在しない事業者情報をダミーで記載することは避けています)
- 準拠法・裁判管轄の妥当性
- 未成年ユーザーの扱い、動画に第三者(対戦相手・観客等)が写り込む場合の取り扱い

## 7. 対応ブラウザ・PWA上の制約

- Web Push は iOS Safari の場合、ホーム画面に追加(PWAとしてインストール)した状態でのみ動作します(iOS 16.4以降)。通常のSafariタブでは通知を受け取れません。
- Service Worker のキャッシュ戦略(`public/sw.js`)はシンプルなネットワークファースト+フォールバックであり、オフライン時に閲覧できるのは事前にキャッシュされたシェルページのみです。
- 動画アップロードは300MB/15分までです(`src/lib/video-analysis/constants.ts`)。Supabaseプロジェクト側のプラン(Storage容量・帯域)によってはこれより厳しい制限がかかる場合があります。

## 8. 外部サービスの認証情報が必要な作業

以下は、実際の外部サービスの認証情報(APIキー・シークレット)がないと動作確認・本番設定ができません。

- Supabase本番プロジェクトの作成・migration適用・RLS確認
- Google OAuth (Googleログイン) のクライアントID/シークレット発行
- VAPIDキーペアの生成と `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` の設定
- `CRON_SECRET` の設定(未設定の場合、`/api/cron/notifications` は誰でも呼び出せる状態になります。本番では**必ず**設定してください)
- Vercel(またはその他ホスティング)へのデプロイ・環境変数設定

## 9. 2巡目監査(同日実施)で対応した項目

前回監査の直後に、同じセッション内で以下を追加対応しました。詳細は [`docs/audit-remediation-report.md`](./audit-remediation-report.md) の「2巡目監査」セクションを参照してください。

- 試合記録(競技名・カテゴリー・会場・チーム名・良かったこと・改善点・次回意識すること・動画URL等)・プロフィール(表示名・審判級・ユーザー名)・スケジュールの主要な自由入力欄すべてに、クライアント側 `maxLength` に加えて **DB側のCHECK制約**(`supabase/migrations/20260717_add_text_length_constraints.sql`、未適用)を追加しました。これにより、ブラウザの入力欄をバイパスしてSupabase REST APIを直接叩いた場合でも上限を超えるデータは保存できません(制約は `not valid` のため既存データの再検証はなく、今後の insert/update のみが対象です)。
- レート制限(Rate Limiting)を追加しました(`src/lib/rateLimit.ts`)。ただし **単一サーバーレスインスタンス内のメモリ上でのみ**カウントするため、Vercel等の複数インスタンス環境では合計の上限を厳密には保証できません(インスタンスをまたぐと個別にカウントされます)。それでも「1つのクライアントが1つのエンドポイントを連打する」典型的な誤操作・簡易スクリプトは防げるため、対応する価値はあると判断しました。外部の共有ストア(Redis/Upstash等の有料サービス)を追加すれば厳密な制限が可能ですが、今回は外部有料サービスを追加しない方針のため見送りました。適用先: `/api/account/delete`・`/api/cron/notifications`・`/api/notifications/test`・`/api/video-analysis/[id]/analyze`。
- `CRON_SECRET` 未設定時に誰でも `/api/cron/notifications` を呼び出せてしまう挙動(旧仕様: 「ローカル開発向けに意図的にスキップ」)を撤廃し、**未設定なら常に401を返すfail-closed**に変更しました。ローカル開発でもこのエンドポイントを試す場合は `.env.local` に何らかの値を設定してください(`.env.local.example` 参照)。
- オープンリダイレクト脆弱性を修正しました。`/login` と `/auth/callback` は `next` クエリパラメータ(ログイン後の遷移先)をそのまま `router.push()` / `NextResponse.redirect(new URL(next, ...))` に渡していたため、`next` に絶対URL(例: `https://evil.example`)を指定されると、信頼できるreflogドメインのリンクに見えるのに実際には外部サイトへ転送されてしまう問題がありました。`src/lib/safeRedirect.ts` で同一オリジンの相対パスのみを許可するよう修正しています。
- 動画アップロードに実際の進捗表示(%表示・プログレスバー)とキャンセルボタンを追加しました(`src/lib/video-analysis/upload.ts` — Supabase JS SDKの `upload()` は進捗・キャンセルの両方をサポートしないため、同じ認証・同じStorage REST APIエンドポイントに対して `XMLHttpRequest` で直接アップロードする方式に変更)。

## 10. 2巡目監査でも対応しなかった項目(P2/P3)

- Playwright等によるE2Eテストは追加していません。ログインを伴うE2Eには実際のSupabaseプロジェクト(本番、または `supabase start` によるローカルスタック)が必要で、今回のセッションでは本番Supabaseへの接続・変更が禁止されており、ローカルSupabaseスタックの起動も環境依存のため確実に実行できると判断できませんでした。ルートハンドラーレベルの認証・認可テスト(未認証401・他人のリソースへの404・レート制限・CRON_SECRET fail-closed)は追加していますが、実際のブラウザ操作を伴うE2Eは今後の課題です。
- 孤立した動画分析レコード(アップロード完了前にブラウザを閉じた場合等)を自動的に片付ける定期cleanupジョブは未実装のままです。
- レート制限は上記の通り単一インスタンス限定です。複数インスタンスにまたがる厳密な制限が必要な場合は、共有ストアの導入を検討してください(運営者の判断・追加費用が必要なため今回は見送り)。

## 11. 3巡目監査(2026-07-18)で対応した項目・今後の課題

詳細は [`docs/audit-remediation-report.md`](./audit-remediation-report.md) の「3巡目監査」セクションを参照してください。エラーバウンダリ・404ページ・データ取得失敗時の誤認表示・ログアウト時のService Workerキャッシュクリア・アカウント削除モーダルのアクセシビリティ・タップ領域・文字コントラスト(AA準拠)・セッション切れ時の再ログイン導線などに対応しました。

今回も対応を見送った項目(将来対応、P3):

- セッション切れ時のフォーム下書き自動保存(localStorage等への一時保存)は未実装です。長文入力中にセッションが切れた場合、再ログイン後に入力内容を復元する手段はまだありません。
- 試合記録・スケジュール・動画解析の一覧に安全上限(`.limit()`)は追加しましたが、ページネーションUIや仮想化リストは未実装です。将来、実際に大量データを持つユーザーが増えた場合はUI側の対応が必要です。
- Service WorkerのキャッシュバージョンID(`reflog-v1`)はビルドごとの自動採番ではなく手動更新のままです。デプロイ時にHTML/JSの構造が変わる場合は、`public/sw.js` の `CACHE_VERSION` を更新することを忘れないでください。
- `src/lib/matches.ts`・`src/lib/schedules.ts`・`src/lib/profile.ts` 等、14箇所に重複する「未ログインなら`ログインが必要です`を投げる」前処理、および6箇所に重複する「`getMatches()`をuseEffectで読み込む」パターンは、共通ヘルパー(`requireUser()`・`useMatches()`)への統合を検討する価値がありますが、影響範囲が広く視覚回帰の確認が難しいため今回は見送りました。

## 12. 4巡目監査(2026-07-18)で対応した項目・今後の課題

詳細は [`docs/audit-remediation-report.md`](./audit-remediation-report.md) の「4巡目監査」セクションを参照してください。3巡目の変更は実は未コミットのまま作業ツリーに残っており、今回まずそれを確認・検証した上で監査を行いました。オープンリダイレクトの制御文字バイパス・JST日付境界バグ(ホーム画面の「今日の予定」判定・AIコーチアドバイス)・予定編集の競合検知漏れ・通知一覧の無限ローディング・フォームのラベル/エラーのアクセシビリティ関連付けなどに対応しました。

今回も対応を見送った項目(将来対応、P3):

- 動画解析の月間利用上限リセット(`src/lib/video-analysis/planUsage.ts`)はUTC暦月基準のままです。DBトリガー(`enforce_video_analysis_quota`)と意図的に同じ基準に揃えてあるため表示とDB強制の不整合はありませんが、「JSTでの月初」を期待するユーザーとは体感がずれる可能性があります。
- タップ領域28×48pxのトグルスイッチ(`NotificationToggle`等)は44px統一の対象外のままです(WCAG AA基準は満たしています)。
- `text-zinc-*` の `focus:outline-none focus:ring-1` を使う一部の入力欄は、グローバルな `:focus-visible` のオレンジ枠ではなく独自のリング色で表示されます(視認可能なフォーカス表示自体は維持されています)。
- クライアントコンポーネント比率(29ページ中27ページが`"use client"`)を下げるサーバーコンポーネント化は、アーキテクチャ変更に相当するため見送りました。
- `supabase/migrations/20260717_secure_function_search_path.sql`・`20260717_add_text_length_constraints.sql` は、4巡目の時点でも本番Supabaseへ**未適用**です。本番反映は運営者の判断で個別に実施してください(手順は各migrationファイル冒頭のコメントを参照)。

## 13. 原動画の自動削除・孤立アップロード対策は「土台のみ」実装済み(2026-07-21・round 6)

**動画は現状、削除の仕組みを有効化しない限り無期限にStorageへ残り続けます。** ロードマップの「動画は一時保存→解析→結果保存→一定期間後に原動画削除」という方針に沿った土台(判定ロジック・実行エンドポイント・運用手順)を今回追加しましたが、**本番での自動実行は有効化していません**。

- 追加したもの: 保持期限切れ判定の純粋関数(`src/lib/video-analysis/retention.ts`)、孤立アップロード検出の純粋関数(`src/lib/video-analysis/orphanUploads.ts`)、両方を実行する `POST /api/cron/video-maintenance`(`CRON_SECRET`によるfail-closed認証、既定で`dryRun=true`)、`plan_limits.retention_days` 列(未適用migration `20260721_add_video_retention.sql`)。
- **有効化していないもの**: 本番Supabaseへのmigration適用、`vercel.json` への自動cron登録、実データに対する`dryRun=false`実行。いずれも運営者が判断するまで何も削除されません。
- 詳しい手順・安全確認方法は [`docs/video-retention-ops.md`](./video-retention-ops.md) を参照してください。
