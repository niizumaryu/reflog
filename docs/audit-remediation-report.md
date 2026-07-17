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

---

# 2巡目監査(同日実施、2026-07-17〜18)

同一セッション内で、上記の1巡目報告を「最大60点の途中結果」として扱い、コード・テスト・設定・ドキュメントをゼロベースで再監査した記録です。1巡目で見つからなかった問題、および1巡目で「未対応」として残していた項目への対応をまとめます。

## P1(公開を妨げる重大問題)

### オープンリダイレクト(`/login` → `/auth/callback` の `next` パラメータ)

- **問題**: `/login` と `/auth/callback` はログイン後の遷移先を指定する `next` クエリパラメータを検証せずに使用していました。`/auth/callback` はサーバー側で `NextResponse.redirect(new URL(next, request.url))` を実行しますが、`next` が絶対URL(例: `https://evil.example`)だと `new URL()` は `base` を無視するため、外部サイトへの302リダイレクトになります。
- **影響**: `https://<正規のreflogドメイン>/auth/callback?code=...&next=https://evil.example/phish` のようなリンクは、見た目は信頼できる自社ドメインなのに実際には外部サイトへ転送される「オープンリダイレクト」でした。フィッシングメール等でリンクの信頼性を偽装する目的で悪用され得ます(URLスキャナ・スパムフィルタ・ユーザー自身の目視確認のいずれもホスト名だけを見て信頼してしまう可能性があるため)。
- **再現方法**: `/auth/callback?code=<有効なcode>&next=https%3A%2F%2Fevil.example` を開くと、修正前は `evil.example` へリダイレクトされていました。
- **対応状況**: 対応済み。`src/lib/safeRedirect.ts` の `sanitizeRedirectPath()` で、`next` が同一オリジンの相対パス(`/` で始まり、`//` や `/\` で始まらない)であることを検証し、そうでなければ `/` にフォールバックするよう `src/app/auth/callback/route.ts` と `src/app/login/page.tsx` を修正しました。単体テスト `src/lib/safeRedirect.test.ts`(9ケース)、および実際のRoute Handlerを通した回帰テスト `src/app/auth/callback/route.test.ts`(3ケース: 正常な相対パス・絶対URL拒否・プロトコル相対URL拒否)を追加しています。

### CRON_SECRET未設定時に誰でも通知APIを呼び出せる(fail-open)

- **問題**: `/api/cron/notifications` は `CRON_SECRET` が設定されている場合のみ認証チェックを行い、未設定の場合はチェック自体をスキップして誰でも呼び出せる状態になっていました。1巡目監査ではこれを「意図的なローカル開発向けの挙動」として記録し、対応しませんでした。
- **影響**: このエンドポイントは `service_role` キーでDBに接続し、全ユーザーの `schedules` / `notification_settings` / `push_subscriptions` を読み取ってプッシュ通知を送信します。`CRON_SECRET` の設定を単に忘れたまま本番公開した場合(=「意図的に無効化した」のではなく「設定漏れ」のケース)、外部の誰でもこのエンドポイントを呼び出して全ユーザーへ通知を送信・`notification_log` を汚染できてしまう状態でした。「未設定」と「意図的に無効化」を区別できない設計そのものがリスクでした。
- **対応状況**: 対応済み。`CRON_SECRET` が未設定、またはヘッダーの値が一致しない場合は常に401を返す **fail-closed** に変更しました(`src/app/api/cron/notifications/route.ts`)。ローカル開発でこのエンドポイントを試す場合も `.env.local` に何らかの値を設定する必要があります(元々の開発環境の `.env.local` には既に値が設定されていたため、この変更によるローカル動作への影響はありませんでした)。単体テスト `src/app/api/cron/notifications/route.test.ts`(4ケース)を追加しています。

## P2(影響範囲が明確な入力検証・UX不具合)

| 問題 | 該当ファイル | 対応 |
| --- | --- | --- |
| 試合記録の主要な自由入力欄(競技名・カテゴリー・会場・チーム名・良かったこと・改善点・次回意識すること・動画URL)に文字数上限が全くない(クライアント・サーバーとも) | `src/components/matches/MatchForm.tsx`, `src/components/matches/QuickMatchForm.tsx`, `src/lib/inputLimits.ts`(新規) | クライアント側 `maxLength` を追加。定数を `src/lib/inputLimits.ts` に一元化し、スケジュールフォームの既存のマジックナンバーもここから参照するようリファクタ |
| 上記と同じ欄に、サーバー側(DB)の検証が一切ない(クライアントを経由しない直接API呼び出しで上限を回避できる) | `supabase/migrations/20260717_add_text_length_constraints.sql`(新規、未適用) | `not valid` CHECK制約を追加(既存データは検証・変更されない安全な変更) |
| プロフィールの表示名・審判級・ユーザー名にも文字数上限がない | `src/app/settings/profile/page.tsx`, 上記migration | クライアント`maxLength`+DB制約を追加 |
| リスクの高いAPI(アカウント削除・cron通知・テスト通知・動画解析開始)にレート制限がない | `src/lib/rateLimit.ts`(新規)、該当4ルート | 固定ウィンドウのインメモリRate Limitを追加。単一インスタンス限定である旨をコード内コメントと `docs/known-limitations.md` に明記 |
| 動画アップロードに進捗表示がなく、キャンセルもできない(大容量ファイルで不安・ブラウザ操作不能感) | `src/lib/video-analysis/upload.ts`, `src/app/video-analysis/new/page.tsx` | Supabase SDKの `upload()` を、同じ認証・同じStorage REST APIエンドポイントへの `XMLHttpRequest` 直叩きに置き換え、`xhr.upload.onprogress` で進捗、`AbortController` でキャンセルを実装。アンマウント時にも自動キャンセルする effect を追加 |
| 一部のエラー・状態表示に `aria-live` がなく、スクリーンリーダーに非同期の結果(成功/失敗)が伝わらない | ログイン・試合記録フォーム・スケジュールフォーム・設定(アカウント削除・プロフィール)・動画分析アップロード画面など | 該当するエラー/状態表示に `role="alert"`/`role="status"` + `aria-live` を追加 |
| 動画選択解除ボタン(×)が32px(推奨タップ領域44pxを下回る) | `src/components/video-analysis/VideoUploader.tsx` | `h-8 w-8` → `h-11 w-11` に変更 |

## P3(軽微・今回は見送り)

| 項目 | 理由・推奨時期 |
| --- | --- |
| 「戻る」ボタン等、アプリ全体で36px(`h-9 w-9`)のタップ領域を使っている箇所が多数(27ファイル)ある | 全画面にまたがるデザインシステム上の一貫した選択であり、44pxへの一括変更は視覚的な確認なしに行うにはリスクが高い(既存デザインを壊す可能性)。個別の視覚確認を伴う次回の作業として推奨 |
| Playwright等によるE2Eテスト | ログインを伴うE2Eには実データ用のSupabaseプロジェクトが必要で、本番接続禁止・ローカルSupabaseスタックの起動が環境依存という制約の中では確実に実行できると判断できなかった。次回、テスト専用Supabaseプロジェクトを用意した上での実施を推奨 |
| 孤立した動画分析レコードの自動cleanupジョブ | 1巡目から継続して未実装。今後の課題 |
| レート制限の複数インスタンス対応(Redis等の共有ストア) | 外部有料サービスの追加が必要なため、運営者の判断が必要 |

## 監査したが2巡目でも問題が見つからなかった主な領域

- 主要な削除・送信ボタンの二重送信防止: `matches/[id]/edit`・`matches/[id]`・`schedule/[id]/edit`・`video-analysis/[id]`・`settings`(アカウント削除)など、確認した範囲ではすべて `isSubmitting`/`isDeleting` 系のstateで保護済みでした。
- CSRF: Supabaseの認証はCookie+Bearerトークンのハイブリッドで、状態変更APIは全て `auth.getUser()` によるトークン検証を経ており、素朴なCSRF(Cookieのみを信頼する設計)には該当しません。
- 動画分析のデモ表示・`is_demo`フラグの一貫性: 1巡目の確認内容から変化なし。

## テスト(2巡目で追加)

- `src/lib/safeRedirect.test.ts`(9ケース)
- `src/lib/rateLimit.test.ts`(7ケース)
- `src/app/api/account/delete/route.test.ts`(1ケース: 未認証401)
- `src/app/api/video-analysis/[id]/analyze/route.test.ts`(4ケース: 不正ID・未認証401・他人データ404・レート制限)
- `src/app/api/cron/notifications/route.test.ts`(4ケース: fail-closed各パターン)
- `src/app/api/notifications/test/route.test.ts`(1ケース: 未認証401)
- `src/app/auth/callback/route.test.ts`(3ケース: 正常系・オープンリダイレクト拒否2パターン)

最終的なテスト総数・実行結果は最終報告(会話内)の検証結果セクションを参照してください。
