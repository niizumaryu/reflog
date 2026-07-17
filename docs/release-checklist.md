# REFLOG 公開前チェックリスト

本番公開・ストア申請の前に、上から順に確認してください。チェックが付けられない項目がある場合は、公開を見送るか、リスクを承知の上で理由を記録してください。

## 品質

- [ ] Build — `npm run build` がエラーなく完了する
- [ ] Lint — `npm run lint` が警告・エラーなく完了する
- [ ] Tests — `npm test` がすべて成功する(`vitest`。DOM/ネットワークに依存しない純粋ロジックのみが対象。RLSやトリガーを含む結合テストはローカルSupabaseスタックが必要なため別途確認すること)

## データベース・インフラ(Supabase)

- [ ] RLS — 全テーブルで行レベルセキュリティが有効になっており、他人のデータを読み書きできないことを確認済み(`supabase/schema.sql` および `supabase/migrations/` の内容を本番プロジェクトに適用済みか)
- [ ] Storage — `profile-icons`(公開読み取り)・`match-videos`(非公開)の各バケットが作成され、想定どおりのRLSポリシーが設定されている
- [ ] Auth — メールログイン・Googleログインが本番のリダイレクトURL/Site URLで動作する(`Authentication > URL Configuration`)。パスワードリセット・確認メールのテンプレートも確認する
- [ ] Push通知 — VAPIDキー(`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`)と `CRON_SECRET` を本番環境に設定し、`/api/cron/notifications` が Vercel Cron から呼ばれることを確認する(`vercel.json`)

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
