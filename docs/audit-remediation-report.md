# 監査・是正レポート(2026-07-17実施分)

対象: `アプリ/reflog`(REFLOG)。開始時点で60テスト全て成功・型チェック/lint/buildすべて成功のクリーンな状態からスタートしました。本レポートは、その状態からさらに発見・修正した内容の記録です。全体の判定・手順・引き継ぎ事項は最終報告(会話内)を参照してください。ここではコードベースに残す形の「何を・なぜ・どう直したか」の記録に絞ります。

## P0(データ消失・認証回避・他人データ漏えい・秘密鍵流出に相当)

### アカウント削除時にStorage(動画・プロフィール画像)が削除されない

- **問題**: `src/app/api/account/delete/route.ts` は `supabase.auth.admin.deleteUser(user.id)` のみを呼び出しており、DBの全テーブルはFK cascadeで削除される一方、Supabase Storageの `match-videos` / `profile-icons` バケット上の実ファイルは削除されていませんでした。
- **影響**: アカウントを削除しても、ユーザーがアップロードした試合動画(対戦相手・観客等の第三者が映り込む可能性がある)がサーバー上に残り続ける。プライバシーポリシー・利用規約の「削除すると復元できません」という説明と実態が食い違う。
- **再現方法**: テストアカウントで動画をアップロード→アカウント削除→Supabase StorageダッシュボードでStorageバケットを確認すると、削除したはずのユーザーのフォルダとファイルが残っている。
- **対応状況**: 対応済み。`src/lib/supabase/storageCleanup.ts` に `removeAllUnderPrefix()` を実装(両バケットの入れ子構造に対応する再帰列挙・削除)。`route.ts` はStorage削除→DB/authユーザー削除の順に処理し、Storage削除に失敗した場合はアカウント削除自体を中止して再試行可能な状態を保つよう変更。単体テスト `src/lib/supabase/storageCleanup.test.ts`(6ケース)を追加。

## P1(公開を妨げる重大問題)

### セッション切れ時のAPI呼び出しが「成功したように」誤動作する

- **問題**: `src/proxy.ts` は `/api/cron/` 以外の全パスで未認証ユーザーを `/login` へ302リダイレクトしていました。`fetch()` はデフォルトでリダイレクトに追従するため、セッションが切れた状態でクライアントが `/api/account/delete` 等にPOSTすると、`response.ok === true`(リダイレクト先のログインページのHTTP 200)かつ本文がHTMLになり、呼び出し元のコードが「成功した」と誤認する可能性がありました。
- **影響**: 例えばアカウント削除ボタンを押した際にセッションが切れていた場合、実際には何も削除されていないのに削除成功・ログアウト・`/login`遷移という「見た目上は正常な」流れになり、ユーザーも開発者も気づきにくい。
- **再現方法**: ブラウザの開発者ツールでSupabaseの認証Cookieを手動で削除した状態のまま、設定画面から「アカウントを削除する」を実行する(修正前は削除APIがリダイレクトHTMLを返し、`response.ok`が真になっていた)。
- **対応状況**: 対応済み。`/api/` 配下は全パスProxyのリダイレクト対象から除外し、各APIルート自身の `supabase.auth.getUser()` チェックが401 JSONを返す設計に統一。既存の4つのAPIルート(`account/delete`・`cron/notifications`・`notifications/test`・`video-analysis/[id]/analyze`)はすべて自前の認証チェックを持つことを確認済み。

## P2(影響範囲が明確な入力検証・UX不具合)

| 問題 | 該当ファイル | 対応 |
| --- | --- | --- |
| スケジュールの大会名・会場・メモに文字数上限がない | `src/app/schedule/new/page.tsx`, `src/app/schedule/[id]/edit/page.tsx` | `maxLength`(200/200/2000)を追加 |
| 試合記録詳細ページの削除ボタンに二重クリック防止がない(編集ページ側は既にあり) | `src/app/matches/[id]/page.tsx` | `isDeleting` state を追加し、処理中はボタンを無効化 |
| 動画アップロード画面でプレビュー用Object URLが解放されない(選択→解除を繰り返すとメモリリーク) | `src/app/video-analysis/new/page.tsx` | `previewUrl` 変更・アンマウント時に `URL.revokeObjectURL` するeffectを追加 |
| 「主審/副審」担当ポジション円グラフが、記録はあるが両方0件(すべて「未設定」)の場合に空白のグラフを表示していた | `src/components/charts/PositionPieChart.tsx` | `EntryTypePieChart` と同じ「記録がまだありません」表示に統一 |

## P3(軽微・将来対応)

| 問題 | 該当ファイル | 対応 |
| --- | --- | --- |
| DBトリガー関数に明示的な `search_path` がない(Supabase linterの標準指摘。実害は既にスキーマ修飾済みのため低い) | `supabase/migrations/20260717_secure_function_search_path.sql`(新規) | `set search_path = public, pg_temp` を追加する独立migrationを作成(未適用、本番反映は運営者の判断) |

## 監査したが問題が見つからなかった主な領域

- RLSポリシー: 全ユーザーデータテーブルで有効。select/insert/update/delete が所有者(`auth.uid() = user_id`)に正しく限定されている。
- `SUPABASE_SERVICE_ROLE_KEY` / `VAPID_PRIVATE_KEY` のクライアント混入なし(使用箇所は2つのRoute Handlerのみ、`server-only` import済み)。
- コード品質: `TODO`/`FIXME`、裸の `@ts-ignore`、`console.log`、実質的な `any` は見つからず。既存の `eslint-disable` はすべて理由コメント付きで妥当。
- 「メール通知」という誤認表現: 見つからず(実装はすべてWeb Push、UI文言も「通知」で統一)。
- 動画分析のデモ表示: `is_demo` フラグ・`DemoDisclaimerBanner`・免責事項が一貫しており、実解析であるかのような誤認表現は見つからず。
- 法的ページ: 実在しない事業者名・住所・電話番号の記載なし。連絡先は運営者本人の実メールアドレスを使用。
- 二重送信防止: ログイン・新規登録・スケジュール保存・試合記録保存・アカウント削除・動画アップロードは、すべて送信ボタンの `disabled` + 処理中フラグで保護されている(今回1件の抜け漏れ=試合記録詳細ページの削除ボタンを修正)。

## テスト

追加した単体テスト: `src/lib/supabase/storageCleanup.test.ts`(6ケース: 空フォルダ・フラット削除・ネスト削除・複数フォルダ・list失敗・remove失敗)。

既存テスト(60件)と合わせた最終件数は、最終報告(会話内)の検証結果セクションを参照してください。
