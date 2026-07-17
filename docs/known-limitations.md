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
