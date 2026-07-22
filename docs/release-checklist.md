# REFLOG 公開前チェックリスト

本番公開・ストア申請の前に、上から順に確認してください。チェックが付けられない項目がある場合は、公開を見送るか、リスクを承知の上で理由を記録してください。

公開前に必ず [`docs/known-limitations.md`](./known-limitations.md)(動画分析がデモ実装であること、課金・ストア配信未対応など)にも目を通してください。

## 品質

- [ ] Build — `npm run build` がエラーなく完了する
- [ ] Lint — `npm run lint` が警告・エラーなく完了する
- [ ] Tests — `npm test` がすべて成功する(`vitest`。DOM/ネットワークに依存しない純粋ロジックのみが対象。RLSやトリガーを含む結合テストはローカルSupabaseスタックが必要なため別途確認すること)

## データベース・インフラ(Supabase)

- [ ] RLS — 全テーブルで行レベルセキュリティが有効になっており、他人のデータを読み書きできないことを確認済み(`supabase/schema.sql` および `supabase/migrations/` の内容を本番プロジェクトに適用済みか。手順は [`docs/supabase-production-verification.md`](./supabase-production-verification.md))
- [ ] 追加migration — `supabase/migrations/20260717_secure_function_search_path.sql`(トリガー関数のsearch_path明示化)を本番に適用済みか
- [ ] 追加migration(2巡目監査) — `supabase/migrations/20260717_add_text_length_constraints.sql`(試合記録・プロフィール・スケジュール・動画タイトルへの文字数上限CHECK制約)を本番に適用済みか
- [ ] 追加migration(6巡目監査) — `supabase/migrations/20260721_add_video_retention.sql`(`plan_limits.retention_days`・`video_analyses.original_video_deleted_at`)を本番に適用済みか。適用しただけでは何も削除されない(詳細・有効化手順は [`docs/video-retention-ops.md`](./video-retention-ops.md))
- [ ] 追加migration(Round 8監査) — `supabase/migrations/20260722_enforce_video_analysis_match_ownership.sql`(`video_analyses.match_id` の所有権検証トリガー)を本番に適用済みか
- [ ] Storage — `profile-icons`(公開読み取り)・`match-videos`(非公開)の各バケットが作成され、想定どおりのRLSポリシーが設定されている
- [ ] Auth — メールログイン・Googleログインが本番のリダイレクトURL/Site URLで動作する(`Authentication > URL Configuration`)。パスワードリセット・確認メールのテンプレートも確認する
- [ ] Push通知 — VAPIDキー(`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`)と `CRON_SECRET` を本番環境に設定し、`/api/cron/notifications` が Vercel Cron から呼ばれることを確認する(`vercel.json`)。**2巡目監査でfail-closedに変更済み: `CRON_SECRET` が未設定の場合、このエンドポイントは常に401を返し、通知が一切送信されなくなります(以前のように「誰でも呼び出せる」ではなく「動かない」側に倒れますが、本番では必須設定である点は変わりません)。**
- [ ] アカウント削除のStorage削除 — テストアカウントで動画・プロフィール画像をアップロード後にアカウント削除を実行し、`match-videos`・`profile-icons` 両バケットからファイルが実際に消えることを確認済み(手順は [`docs/manual-test-plan.md`](./manual-test-plan.md) のE章)
- [ ] Rate Limiting — `src/lib/rateLimit.ts` は単一サーバーレスインスタンス内のメモリ限定であることを理解した上で公開している(複数インスタンスでは厳密な合計上限にはならない。詳細は [`docs/known-limitations.md`](./known-limitations.md))
- [ ] 動画ストレージのコスト対策 — `plan_limits`(月間解析回数・保持日数)が意図した値になっているか確認し、`POST /api/cron/video-maintenance` を dry-run で一度実行して削除予定件数が妥当か確認済み(手順は [`docs/video-retention-ops.md`](./video-retention-ops.md)。**未実施でも公開はできるが、動画Storageが無期限に増え続ける点は理解しておくこと**)
- [ ] 管理者(永久無料)アカウント — 運営者自身のアカウントの `profiles.plan_type` を Supabase SQL Editor から `'admin'` に設定済み(アプリ内に設定UIはなく、手動SQL操作のみ。手順・注意点は [`docs/known-limitations.md`](./known-limitations.md) の「4. 課金は未実装」を参照)

## 法務

- [ ] 利用規約 — `/terms` の内容が最新かつ実態と合っている(連絡先メールアドレス等)
- [ ] プライバシーポリシー — `/privacy` の内容が最新かつ実態と合っている。取得している情報の一覧が実装とズレていないか確認する
- [ ] アカウント削除 — 設定画面 → アカウント削除の導線が動作し、確認ダイアログ表示 → 削除実行 → ログアウトまで一気通貫で確認済み(`src/app/settings/page.tsx`、`src/app/api/account/delete/route.ts`)

## デプロイ・配布

- [ ] GitHub Push — 最新の変更をリモートリポジトリにpush済み、mainブランチがデプロイ対象のブランチと一致している
- [ ] Apple — App Store Connect側の審査情報・スクリーンショット・プライバシー表示(App Privacy)を `/privacy` の内容と一致させて登録済み(配布する場合)
- [ ] Google — Google Play Consoleのデータセーフティフォームを `/privacy` の内容と一致させて登録済み(配布する場合)

## 決済(導入する場合)

- [ ] Stripe — 本番キーへの切り替え、Webhookエンドポイントの本番URL登録、決済導線の実地テストが完了している
- [ ] PayPay — 本番の加盟店設定・APIキー切り替え、決済導線の実地テストが完了している

---

チェックリストの各項目は、実装状況の変化に応じて追記・更新してください。
