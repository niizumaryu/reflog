# アカウント削除・データ削除の仕組み

## ユーザーが実行できる削除操作

| 操作 | 画面 | 実装 |
| --- | --- | --- |
| 個別の試合記録を削除 | `/matches/[id]` | `src/lib/matches.ts` の `deleteMatch` (RLSで本人の行のみ削除可能) |
| 個別の予定を削除 | `/schedule/[id]/edit` | `src/lib/schedules.ts` の `deleteSchedule` |
| 個別の動画分析を削除 | `/video-analysis/[id]` | `src/lib/video-analysis/videoAnalyses.ts` の `deleteVideoAnalysis`(Storage→DBの順で削除。Storage削除が失敗した場合は何も削除されず、再試行可能) |
| アカウント全体を削除 | `/settings` → 「アカウントを削除する」 | `src/app/api/account/delete/route.ts` |

## アカウント削除の処理順序(2026-07-17改修後)

1. Cookieセッションからログインユーザーを取得(未ログインなら401)。
2. **Storageクリーンアップ**: `match-videos` バケットと `profile-icons` バケットの `${user_id}/` 配下を再帰的に列挙・削除(`src/lib/supabase/storageCleanup.ts`)。
   - どちらか一方でも失敗した場合、**ここで処理を中止**し、DBデータは一切削除しないまま500エラーを返します(再試行可能な状態を維持するため)。
   - `match-videos` は `${user_id}/${video_analysis_id}/original.ext` という2階層構造のため、再帰的な列挙が必要です(`profile-icons` は `${user_id}/${filename}` の1階層)。
3. Storageクリーンアップが成功したら、`service_role` キーを使って `supabase.auth.admin.deleteUser(user.id)` を呼び出します。
4. `auth.users` の削除は、以下のテーブルへ `on delete cascade` で連鎖します(`supabase/schema.sql` 参照): `profiles` / `matches` / `annual_goals` / `schedules` / `push_subscriptions` / `notification_settings` / `notification_log` / `notifications` / `video_analyses`(さらにその子テーブル `analysis_quality_metrics` / `analysis_events` / `coaching_results` / `analysis_feedback` は `video_analyses` へのcascadeで連鎖削除)。
5. 成功したらクライアント側で `supabase.auth.signOut()` を実行し、`/login` へ遷移します(`src/app/settings/page.tsx`)。

## なぜStorageクリーンアップが必要だったか(修正前の問題)

Supabase Storageの `storage.objects` テーブルは、`auth.users` に対する `on delete cascade` の対象では**ありません**。そのため、修正前の実装(`deleteUser()` のみ呼び出し)では、DB上のレコードはすべて削除されても、**Storageバケット上の実ファイル(動画・プロフィール画像)はそのまま残り続けていました**。

動画には対戦相手・観客等の第三者(未成年を含む可能性がある)が映り込むこともあるため、これは「アカウントを削除したのに、その人がアップロードした動画データがサーバー上に残り続ける」という重大なプライバシー上の欠陥でした。

## 一部失敗時の挙動

- Storage削除が失敗した場合: アカウント自体は削除されず、ユーザーには「アップロード済みの動画・画像データの削除に失敗したため、アカウント削除を中止しました」というエラーメッセージが表示されます。DBデータ・authユーザーは残ったままなので、時間をおいて再度「アカウントを削除する」を実行できます。
- `deleteUser()` 自体が失敗した場合(Storageは既に削除済み): エラーメッセージがそのまま返されます。この場合はStorageは空になっている一方、DBデータとauthユーザーは残っています。再実行すればStorage側は「削除対象なし」として即座にスキップされ、`deleteUser()` から再試行されます(冪等)。

## 監査ログへの配慮

削除処理のサーバーログ(`console.error`)には、失敗したStorageパスの一覧とユーザーIDのみを出力し、メールアドレスや氏名など個人を特定できる情報は出力していません。

## 手動確認手順(本番)

本番Supabaseプロジェクトで実際に動作確認する場合は `docs/manual-test-plan.md` の「アカウント削除」セクションを参照してください。テスト用アカウントで、動画アップロード→アカウント削除→Supabaseダッシュボードの Storage 画面で `match-videos` / `profile-icons` 双方に当該ユーザーのフォルダが残っていないことを目視確認してください。
