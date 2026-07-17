# セキュリティ設計・監査メモ

REFLOGのセキュリティ境界・仕組みと、2026-07-17時点の監査で確認した内容をまとめます。実装の詳細な変更履歴は `git log` を参照してください。

## 1. 認証・セッション

- 認証はSupabase Auth(メール+パスワード、Googleログイン)。セッションはCookieベース(`@supabase/ssr`)。
- `src/proxy.ts`(Next.js Proxy/Middleware)が未認証ユーザーを保護ページから `/login` へリダイレクトします。
- **2026-07-17の変更**: `/api/` 配下のAPIルートはProxyのリダイレクト対象から除外しました。理由: すべてのAPIルートは自前で `supabase.auth.getUser()` を呼び最終的に401 JSONを返す設計になっている一方、Proxyが先にリダイレクト(302 → `/login` のHTML)を返すと、`fetch()` はデフォルトでリダイレクトに追従し `response.ok === true` かつ本文がHTMLになるため、呼び出し元が「成功した」と誤認する可能性がありました(例: セッション切れの状態でアカウント削除ボタンを押すと、実際には削除されていないのに成功したように見える)。現在は各APIルートが直接401 JSONを返します。

## 2. 認可・RLS(Row Level Security)

- ユーザーデータを持つ全テーブル(`profiles` / `matches` / `annual_goals` / `schedules` / `push_subscriptions` / `notification_settings` / `notifications` / `video_analyses` とその子テーブル群 / `plan_limits`)でRLSが有効です。
- 所有権チェックは一貫して `auth.uid() = user_id`(または `profiles.id`)方式です。
- `notification_log` はRLSを有効化した上でクライアント向けポリシーを一切定義していないため、anon/authenticatedロールからは常にアクセス不可(service roleのみ書き込み)です。
- 子テーブル(`analysis_quality_metrics` 等)は、RLSの行所有チェックだけでは「自分の行として、他人の `video_analysis_id` を参照する」ケースを防げないため、DBトリガー `enforce_video_analysis_ownership` で追加検証しています。
- `video_analyses.status` は、RLSの所有者チェックだけでは「所有者本人が不正な状態遷移(例: `uploaded` → いきなり `completed`)を行う」ことを防げないため、DBトリガー `enforce_video_analysis_status_transition` で許可された遷移のみに制限しています。
- `profiles.plan_type` / `monthly_video_analysis_count` は、通常の「本人の行は更新できる」ポリシーだけでは本人がクォータを直接書き換えられてしまうため、DBトリガー `protect_profile_plan_columns` でシステム(quotaトリガー・service role)以外からの変更を拒否しています。

## 3. Storage

- `profile-icons` バケット: 公開読み取り・5MBまで・JPG/PNGのみ。パスは `${user_id}/...` で、書き込み系ポリシーはこのプレフィックスを所有権チェックとして利用。
- `match-videos` バケット: **非公開**(`public: false`)。読み取りも含めて全操作が `${user_id}/...` プレフィックスでの所有権チェック対象です。再生は署名付きURL(`getPlaybackUrl`)経由のみ。
- **P0として発見・修正**: アカウント削除API(`src/app/api/account/delete/route.ts`)は、`auth.users` の削除(DB行はFK cascadeで自動削除)のみを行っており、Storage上のファイル(プロフィール画像・動画)を削除していませんでした。Supabase StorageのオブジェクトはPostgresのFK cascadeの対象外のため、削除後もファイルが残り続ける状態でした。動画には対戦相手・観客等の第三者(未成年を含む可能性)が写り込むこともあるため、これは重大なプライバシー上の欠陥です。`src/lib/supabase/storageCleanup.ts` の `removeAllUnderPrefix()` で両バケットの `${user_id}/` 配下を再帰的に削除してから `auth.users` を削除するよう修正し、Storage削除が失敗した場合はアカウント削除自体を中止(データは消さず再試行可能な状態を維持)するようにしました。単体テストは `src/lib/supabase/storageCleanup.test.ts` を参照してください。

## 4. サーバー専用の鍵・環境変数

- `SUPABASE_SERVICE_ROLE_KEY` は `src/lib/supabase/admin.ts`(`server-only` importあり)からのみ使用され、使用箇所は `src/app/api/account/delete/route.ts` と `src/app/api/cron/notifications/route.ts` の2箇所のみです。クライアントコンポーネントからimportされていないことを確認済みです。
- `VAPID_PRIVATE_KEY` はサーバー専用(Route Handler内のみ)。`NEXT_PUBLIC_VAPID_PUBLIC_KEY` のみクライアントに公開されます。
- `NEXT_PUBLIC_*` 以外の環境変数がクライアントバンドルに混入していないか、`grep -r "SUPABASE_SERVICE_ROLE_KEY\|VAPID_PRIVATE_KEY" src` を "use client" ファイルに対して確認し、問題がないことを確認しました。

## 5. Cron認証

- `/api/cron/notifications` は `CRON_SECRET` 環境変数が設定されていれば `Authorization: Bearer $CRON_SECRET` を要求します。
- **重要**: `CRON_SECRET` が未設定の場合、この認証チェックはスキップされ、誰でも呼び出せる状態になります(意図的なローカル開発向けの挙動)。**本番環境では必ず `CRON_SECRET` を設定してください。** `docs/release-checklist.md` にチェック項目があります。

## 6. 入力検証

- 動画アップロード: MIMEタイプ・ファイルサイズ・動画の長さをクライアント側(`src/lib/video-analysis/upload.ts`)とDB側CHECK制約(`supabase/migrations/20260717_harden_video_analysis.sql`)の両方で検証しています(`not valid` 制約のため既存データの再検証は不要かつ安全)。
- スケジュール(`title`・`place`・`memo`)には今回 `maxLength` を追加しました(200/200/2000文字)。他のフォーム(試合記録の自由記述欄等)には文字数上限がまだありません(`docs/known-limitations.md` の9番を参照)。
- 動的ルートの `id` パラメータ(例: `/api/video-analysis/[id]/analyze`)はUUID形式かどうかを正規表現で検証してからDBに問い合わせています。

## 7. Rate Limiting / Idempotency

- 明示的なRate Limitミドルウェアは導入していません。
- 冪等性は個別に設計されています。例: `/api/cron/notifications` は `notification_log` の一意制約でデデュープ、`/api/video-analysis/[id]/analyze` は `status` のアトミックなUPDATE(`.eq("status", ...)`)で二重起動を防止、動画分析の月間上限はDBトリガーで行ロック(`for update`)しながらアトミックにカウントしています。

## 8. XSS / インジェクション

- SupabaseクライアントはすべてパラメータバインディングされたPostgREST呼び出しであり、生SQL文字列結合は使用していません。
- ユーザー入力を `dangerouslySetInnerHTML` で描画している箇所は見つかりませんでした。
- 外部リンク(`target="_blank"`)には `rel="noopener noreferrer"` が付与されています。

## 9. 今回の監査で修正した項目のまとめ

| 分類 | 内容 | ファイル |
| --- | --- | --- |
| P0 | アカウント削除時にStorage(動画・アイコン)が削除されない | `src/app/api/account/delete/route.ts`, `src/lib/supabase/storageCleanup.ts` |
| P1 | セッション切れ時のAPI呼び出しがリダイレクトに追従し成功と誤認される | `src/proxy.ts` |
| P2 | スケジュールの自由入力欄に文字数上限がない | `src/app/schedule/new/page.tsx`, `src/app/schedule/[id]/edit/page.tsx` |
| P3 | トリガー関数に明示的な `search_path` がない(既存の参照はすべてスキーマ修飾済みのため実害は低い) | `supabase/migrations/20260717_secure_function_search_path.sql` |

未修正の項目・人間による判断が必要な項目は `docs/audit-remediation-report.md` を参照してください。
