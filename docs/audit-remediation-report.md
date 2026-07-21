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

---

# 3巡目監査(2026-07-18実施、Pre Release Quality Upgrade)

2巡目までの内容を「最大72点の途中結果」として引き継ぎ、新機能を一切追加せずに世界公開基準での全体監査を実施した記録です。今回はコード変更前にレイアウト・アクセシビリティ・エラー耐性・パフォーマンス・コード品質の4領域を並行監査してから着手しました。

## P0(絶対修正)

### 未処理例外・404で復帰不能な行き止まり画面になる

- **問題**: `error.tsx`・`global-error.tsx`・`not-found.tsx` がアプリ全体に1つも存在せず、クライアントコンポーネントで例外が投げられるとNextの素のエラー画面(本番では汎用的な白画面)になり、アプリ内に戻る手段がありませんでした。存在しないURL(通知からの古いディープリンク・タイプミス等)も同様にNext標準の404になっていました。
- **対応状況**: 対応済み。`src/app/error.tsx`(ルートエラーバウンダリ、「もう一度試す」「ホームに戻る」)・`src/app/global-error.tsx`(レイアウト自体が壊れた場合の最終フォールバック)・`src/app/not-found.tsx`(ブランドに合わせたカスタム404)を追加しました。

## P1(公開前修正)

| 問題 | 該当ファイル | 対応 |
| --- | --- | --- |
| ダッシュボード/成長/成長グラフ/バッジ/ホームページで、データ取得失敗時に「記録がありません」という空状態と同じ表示になり、通信障害を「データが消えた」と誤認させる | `src/app/dashboard/page.tsx`, `src/app/growth/page.tsx`, `src/app/growth/charts/page.tsx`, `src/app/growth/badges/page.tsx`, `src/app/page.tsx` | 取得失敗を専用の`loadError`状態として分離し、赤色のエラーバナー+再読み込み導線を表示するよう統一(`src/app/report/page.tsx`は元々正しく実装済みと確認) |
| 設定画面のログアウトボタンに`try/catch`・連打防止・オフライン時のフィードバックがなく、同画面の他ボタンと一貫性がなかった | `src/app/settings/page.tsx` | エクスポート/削除ボタンと同じ`try/catch`+busy状態パターンに統一 |
| アカウント削除確認モーダルに`role="dialog"`/`aria-modal`・フォーカストラップ・Escapeクローズ・クローズ時のフォーカス復帰がなく、スクリーンリーダー・キーボード操作で認識・脱出できなかった | `src/app/settings/page.tsx` | ダイアログ属性・Tabトラップ・Escape・フォーカス復帰を実装 |
| グローバルな`:focus-visible`スタイルが未定義で、キーボード操作時のフォーカス位置が全ページでブラウザ既定に依存していた | `src/app/globals.css` | オレンジ系アクセントカラーの`outline`を全要素に定義 |
| `text-zinc-500`(黒背景でコントラスト比約4.3:1)・`text-zinc-600`(約2.7:1)がWCAG AA(通常文字4.5:1)を系統的に下回っていた(36ファイル・約200箇所) | 該当42ファイル | 全て`text-zinc-400`(黒背景で7:1以上)に統一 |
| ログアウト・アカウント削除後もService Workerのキャッシュ(URLのみをキーとし、ユーザーを区別しない)がクリアされず、共有端末で次のユーザーがオフライン時に前ユーザーの残留ページを見る可能性があった | `src/app/settings/page.tsx` | ログアウト・アカウント削除の両方で`caches.delete()`を実行するよう追加 |
| セッション切れ時、試合記録・スケジュールの保存フォームが「ログインが必要です」という汎用エラーのみを表示し、原因・入力内容が残っていること・再ログイン導線が伝わらなかった | `src/lib/sessionError.ts`(新規), `src/components/matches/MatchForm.tsx`, `src/components/matches/QuickMatchForm.tsx`, `src/app/schedule/new/page.tsx`, `src/app/schedule/[id]/edit/page.tsx` | セッション切れを判定するヘルパーを追加し、該当時は専用メッセージ+別タブでログイン画面を開くリンクを表示 |

## P2(UX改善)

| 問題 | 該当ファイル | 対応 |
| --- | --- | --- |
| 「戻る」ボタン等、44px未満(36px/32px/40px)のタップ領域がアプリ全体で約25箇所残っていた(前回監査では視覚確認なしのリスクを理由に見送り) | 24ファイル + `src/components/schedule/MonthlyCalendar.tsx`, `src/components/notifications/NotificationListItem.tsx` | 全て44px(`h-11 w-11`)に統一(className文字列の機械的置換のため視覚崩れリスクは低いと判断) |
| 動画解析の再試行がAPIレスポンスの成否を確認せず常に`window.location.reload()`していたため、レート制限等のエラーが握りつぶされていた | `src/app/video-analysis/[id]/processing/page.tsx` | `response.ok`を確認し、失敗時はエラーメッセージを表示するよう修正 |
| 試合記録・スケジュール・動画解析の一覧取得に上限がなく、長期利用者は将来的に無制限件数を毎回全件取得する設計だった | `src/lib/queryLimits.ts`(新規), `src/lib/matches.ts`, `src/lib/schedules.ts`, `src/lib/video-analysis/videoAnalyses.ts` | 安全上限(試合/予定2000件、動画解析1000件)を`.limit()`で追加(実利用での到達は想定しておらず、あくまで最悪ケースの歯止め) |
| ホーム・年間レポート・成長グラフの3ページで、recharts(重量級ライブラリ)を持つ8種のチャートコンポーネントが全て静的importで初期バンドルに含まれていた | `src/components/charts/dynamic.tsx`(新規)、上記3ページ | `next/dynamic`(`ssr:false`)+高さ固定のスケルトンに置き換え、レイアウトシフトなしで初期バンドルから分離 |
| 未使用のexport(`RatingField`・`PIPELINE_STAGES`・`COACHING_PROGRESS_AFTER`・`getFeedback`)が残存 / 移行済みレガシーlocalStorageデータがクリアされず永続していた | `src/lib/matches.ts`, `src/lib/video-analysis/constants.ts`, `src/lib/video-analysis/videoAnalyses.ts`, `src/lib/migration.ts` | 未使用exportを削除、`clearLegacyLocalMatches()`を移行成功後に呼ぶよう配線 |

## 監査したが3巡目でも問題が見つからなかった主な領域

- `TODO`/`FIXME`/`console.log`/`@ts-ignore`/実質的な`any`: 引き続き0件。
- npm依存パッケージ: 全て使用されており未使用パッケージなし。
- デモ動画解析(`mockAdapters.ts`)の隔離: `pipeline.ts`からのみ参照され、`is_demo`フラグ・バナー表示も一貫。
- ダークモード: そもそもライトモードを持たない常時ダークテーマ設計であり、「ライト/ダークの不整合」は該当なし(将来ライトモードを追加する場合は別途対応が必要)。

## テスト

新規テストファイルの追加はなし(今回はUI状態・エラーハンドリング・アクセシビリティ属性・クエリの安全上限が中心で、既存の単体テスト対象範囲外)。既存96件のテストは全て成功を維持。`npm run lint`(0件)・`npx tsc --noEmit`(0件)・`npm run build`も成功を確認済み。

---

# 4巡目監査(2026-07-18実施、公開前欠陥探索・回帰防止監査)

3巡目までの内容を「最大60点の途中結果」として引き継ぎ、3巡目の変更が実際にコミットされていない(作業ツリーに未コミットのまま残っていた)ことをまず確認したうえで、新機能追加なしで実施した記録です。セキュリティ・耐障害性/データ整合性・UI/アクセシビリティ・コード品質/テスト品質の4領域を並行調査してから着手しました。

## P1(公開前修正)

### オープンリダイレクトの制御文字バイパス(2巡目・3巡目の修正が不完全だった)

- **問題**: `src/lib/safeRedirect.ts` の `isSafeRedirectPath()` は `//` と `/\` で始まるパスのみ拒否しており、タブ・改行等の制御文字を考慮していませんでした。`new URL(next, base)` はパース前に制御文字を除去するため、`"/\t/evil.example"` は検証を通過したのち `"//evil.example"`(プロトコル相対URL)として解決されてしまいます。
- **再現方法**: `node`で実際に `new URL("/\t/evil.example", "http://localhost/auth/callback").host` を評価すると `evil.example` になることを確認済み。
- **対応状況**: 対応済み。制御文字(` `-``)を含むパスを拒否するチェックを追加。回帰テスト4件を追加(`src/lib/safeRedirect.test.ts`)。

### ホーム画面の「今日」判定がUTC基準になっていた(JST早朝に予定・AIアドバイスがずれる)

- **問題**: `src/app/page.tsx` と `src/lib/coach/todayAdvice.ts` が `new Date().toISOString().slice(0,10)` でその日の日付を求めており、UTC基準でした。JST 00:00〜08:59 の間はUTC側の日付が前日のままのため、「今日の予定」フィルタや「明日は試合です」等のAIコーチアドバイスが1日ずれる可能性がありました。
- **対応状況**: 対応済み。JST基準で日付文字列を返す `src/lib/date.ts`(`jstDateString`)を新設し、上記2箇所に加え、同種のロジックが重複していた `src/app/api/cron/notifications/route.ts` と `src/lib/notifications/aiAdvice.ts` もこの共通関数に統一。回帰テスト(`src/lib/date.test.ts`・`src/lib/coach/todayAdvice.test.ts`)を追加。

### 予定編集(`updateSchedule`)が対象行の不存在を検知できず、削除済み予定の編集が「保存成功」と表示されていた

- **問題**: `src/lib/schedules.ts` の `updateSchedule` は `.update(...).eq("id", id)` のみで `.select()` を伴わず、他タブで削除済みの予定を編集・保存すると、Supabaseは0件更新でも `error: null` を返すため「予定を更新しました！」と表示されていました(実際には何も更新されていない)。`updateMatch` は同種の問題を `.select().single()` で回避済みでしたが、`updateSchedule` だけ対応漏れでした。
- **対応状況**: 対応済み。`.select("id")` を追加し0件時は専用エラー(`SCHEDULE_NOT_FOUND_MESSAGE`)を投げるよう変更。編集ページ(`src/app/schedule/[id]/edit/page.tsx`)はこのエラーを検知して「予定が見つかりませんでした」画面に遷移するよう修正。回帰テスト3件を追加(`src/lib/schedules.test.ts`)。

### 通知一覧ページで初回取得が失敗すると「読み込み中...」が無限に表示され続けていた

- **問題**: `src/app/notifications/page.tsx` は取得失敗時に `error` のみを設定し、`notifications` は初期値の `null` のまま変化しないため、`notifications === null` を条件とする「読み込み中...」表示がエラーバナーの下に永続して残っていました。再試行手段もありませんでした。
- **対応状況**: 対応済み。失敗時に `notifications` を `[]` へ、エラー表示時はローディング/空状態を出さないよう分岐を修正し、再読み込みボタンを追加。

### フォームのラベルとエラーメッセージが入力欄に一切紐付いていなかった(スクリーンリーダー利用者への影響)

- **問題**: `src/components/matches/MatchForm.tsx` の `Field` コンポーネントは `<label>` と `<input>` が兄弟要素で、`htmlFor`/`id` による関連付けが存在しませんでした(視覚的には近接しているだけ)。フィールドエラーも `aria-describedby`/`aria-invalid` で紐付けられておらず、スクリーンリーダー利用者には赤枠の視覚情報以外エラーが伝わらない状態でした。試合記録・Quick Log・プロフィール・スケジュールの各フォームに共通する問題でした。
- **対応状況**: 対応済み。`Field` コンポーネント(`MatchForm.tsx`・`settings/profile/page.tsx`)を、単一のネイティブ入力要素を子に持つ場合は `useId()` で生成したIDを `htmlFor`/`id`/`aria-describedby`/`aria-invalid` として自動的に結び付けるよう変更。スケジュール作成・編集ページも同様に `id`/`htmlFor`/`aria-describedby` を追加。`RatingInput`(星評価ボタン群)は `role="group"`+`aria-labelledby` でグループラベルを関連付け。

## P2(品質向上・低リスクで実施)

| 問題 | 該当ファイル | 対応 |
| --- | --- | --- |
| 年間レポートページがデータ取得失敗を「この年の記録はまだありません」という空状態と同じ表示にしていた | `src/app/report/page.tsx` | エラー時は `matches` を `null` のまま保持し、専用バナー+再読み込みボタンを表示するよう分離 |
| 動画アップロード画面のタイトル入力が文字数上限を独自に`200`とハードコードしており、`src/lib/inputLimits.ts` の一元管理から外れていた | `src/app/video-analysis/new/page.tsx` | `SHORT_TEXT_MAX` を参照するよう修正 |
| `prefers-reduced-motion` が一切考慮されておらず、前庭障害等でアニメーションを無効化したいユーザーへの配慮がなかった | `src/app/globals.css` | `@media (prefers-reduced-motion: reduce)` でアニメーション・トランジションを実質無効化する全体ルールを追加 |
| ホーム画面のAIアドバイスカードの主要ボタン(40px)・動画解析フィードバックの評価ボタン(36px)が44pxのタップ領域基準を下回っていた | `src/components/home/TodayAdviceCard.tsx`, `src/components/video-analysis/FeedbackControl.tsx` | `h-11`(44px)に統一 |
| プロフィール画像アップロードが、拡張子をクライアント指定のファイル名(`file.name`)から取得しており、動画アップロードで既に採用済みの「検証済みMIMEタイプから拡張子を決定する」方式と不統一だった | `src/lib/profile.ts` | 動画アップロードと同じ、MIMEタイプ→拡張子のマップ方式に統一 |
| `CRON_SECRET` の照合が単純な文字列比較(`!==`)で、理論上タイミング攻撃の余地があった | `src/app/api/cron/notifications/route.ts` | `crypto.timingSafeEqual` を使った定時間比較に変更。回帰テスト2件を追加 |
| 動画解析パイプライン失敗時のステータス更新が、同ファイル内の他のクエリと異なり `user_id` での絞り込みを省略していた(RLSに完全依存) | `src/app/api/video-analysis/[id]/analyze/route.ts` | `.eq("user_id", user.id)` を追加(多層防御) |
| `supabase/schema.sql`(新規構築用スクリプト)の4つのトリガー関数に、既存の是正migration(`20260717_secure_function_search_path.sql`)が付与した `search_path` 固定化が反映されておらず、新規構築時にこの是正が失われる状態だった | `supabase/schema.sql` | migrationと同じ `set search_path = public, pg_temp` を追加(本番DBへの適用は行っていない、コードのみの修正) |
| 試合記録フォームが「大会名」の必須チェックを`trim()`で行う一方、保存する値自体はトリムしていなかった(空白だけ追加した値が保存されうる) | `src/components/matches/MatchForm.tsx`, `src/components/matches/QuickMatchForm.tsx` | 送信時にトリム済みの値を保存するよう修正 |
| ダッシュボード・ホーム・成長・成長グラフ・バッジ・試合一覧・予定一覧・動画解析一覧の各ページで、取得失敗時に「通信に失敗しました」という汎用エラーのみが表示され、セッション切れによる失敗と区別できなかった | 8ページ、`src/components/LoadErrorBanner.tsx`(新規) | セッション切れを検知した場合は専用メッセージ+ログイン導線を表示する共通バナーコンポーネントを新設し統一 |

## P3(将来対応・今回は見送り)

- 動画解析の月間利用上限リセットが暦月(UTC基準)で計算されている(`src/lib/video-analysis/planUsage.ts`)。DBトリガー(`enforce_video_analysis_quota`)と同じ基準に意図的に合わせてあり、表示とDB強制の間に不整合はないため、上記のJST日付バグとは性質が異なると判断し見送り。
- タップ領域28×48pxのトグルスイッチ(`NotificationToggle`等)はWCAG AA基準(24×24px)は満たしているが、他要素の44px統一からは外れている。視覚確認なしでの一括変更はリスクがあるため見送り。
- `text-zinc-*` 系の `focus:outline-none focus:ring-1` が一部の入力欄でグローバルな `:focus-visible` のオレンジ枠を上書きしている(視認可能なフォーカス表示自体は維持されるため実害は低い)。
- クライアントコンポーネント比率が高い(29ページ中27ページが`"use client"`)。Supabase SSRクライアントを使ったサーバーコンポーネント化はアーキテクチャ変更に相当するため見送り。

## テスト

新規テストファイル: `src/lib/date.test.ts`・`src/lib/coach/todayAdvice.test.ts`・`src/lib/schedules.test.ts`・`src/lib/matches.test.ts`・`src/lib/sessionError.test.ts`。既存テストファイルへの追加: `src/lib/safeRedirect.test.ts`(制御文字バイパスの回帰テスト4件)・`src/app/api/cron/notifications/route.test.ts`(定時間比較の回帰テスト2件)・`src/app/api/account/delete/route.test.ts`(Storage削除失敗時にdeleteUserが呼ばれないことを検証する2件 — 3巡目まで無テストだった安全上の不変条件)。最終的なテスト総数・実行結果は最終報告(会話内)を参照してください。

---

# 5巡目監査(2026-07-18実施、世界公開前RC-1最終審査)

4巡目までの内容を「最大60点の途中結果」として引き継ぎ、コード変更前に独立した6領域(セキュリティ/データ整合性・信頼性/アクセシビリティ・多ペルソナUX/パフォーマンス・運用/保守性・テスト品質/プロダクト・収益・ストア適合性)を並行監査してから着手した。既存監査の記述を鵜呑みにせず、対応済みとされた項目もすべて現在のコードを直接読んで再検証した。

## P1(公開前修正)

### プッシュ購読の`endpoint`が未検証で、サーバー発リクエストの対象になり得た(SSRF)

- **問題**: `src/lib/notifications/settings.ts`の`savePushSubscription`は、クライアントの`PushSubscription.toJSON()`から得た`endpoint`をURL形式の検証なしにそのまま`push_subscriptions`テーブルへ保存していた。RLSの挿入ポリシーは`auth.uid() = user_id`のみを検証しており、`endpoint`の形式・ホスト名を制限するDB制約もなかった。認証済みユーザーがブラウザのPushManagerを経由せずSupabase REST APIを自分のJWTで直接呼び出せば、`endpoint`に任意のURL(例: 内部ネットワークのホスト)を保存できる状態だった。この値は`src/app/api/cron/notifications/route.ts`(毎時実行・service-role・全ユーザー対象)と`src/app/api/notifications/test/route.ts`(ユーザー自身がボタンで呼び出し可能)の両方で、検証なしに`webpush.sendNotification({endpoint, ...})`へそのまま渡され、アプリ自身のVAPID鍵で署名されたサーバー発リクエストとして送信されていた。
- **対応状況**: 対応済み。`src/lib/notifications/pushEndpoint.ts`(新規)に`isValidPushEndpoint()`を実装し、`https:`スキームであること・ローカル/プライベートアドレス(localhost・127.\*・10.\*・172.16-31.\*・192.168.\*・169.254.\*・::1)宛てでないことを検証。書き込み時(`savePushSubscription`)と送信時(cronルート・テスト通知ルートの両方、送信直前)の二重で検証し、不正な行は送信をスキップした上で削除するようにした。単体テスト`src/lib/notifications/pushEndpoint.test.ts`(6ケース)を追加。

## P1(アクセシビリティ回帰 — 前回監査の主張が現状のコードと一致していなかった)

### 通知設定画面の非同期結果メッセージに`aria-live`がなかった

- **問題**: 3巡目監査は「エラー・状態表示にaria-liveを追加した」と記録していたが、`src/components/notifications/NotificationToggle.tsx`のテスト通知結果・エラー表示、および`src/components/notifications/NotificationSettingsForm.tsx`のエラー表示には`role`/`aria-live`が付いていなかった(スクリーンリーダー利用者に成功/失敗が伝わらない、WCAG 4.1.3)。
- **対応状況**: 対応済み。成功メッセージに`role="status" aria-live="polite"`、エラーメッセージに`role="alert" aria-live="assertive"`を追加(アプリ内の既存パターンに統一)。

### 予定の新規作成・編集画面に戻る手段がなかった

- **問題**: `src/app/schedule/new/page.tsx`と`src/app/schedule/[id]/edit/page.tsx`の入力画面(読み込み完了後の通常状態)にはヘッダー・戻るリンクが一切なく、同ファイル内のローディング/エラー/見つからない状態では「一覧に戻る」リンクがあるにもかかわらず、メインの入力画面だけ抜けていた。インストール済みPWA(ブラウザChromeなし)では、この2画面から戻る手段が実質的になかった。
- **対応状況**: 対応済み。両画面の見出し上に「一覧に戻る」/「戻る」リンク(44px高さ、既存の他画面と同系統のスタイル)を追加。

## 運用可視性(P1として対応)

### 通知cronが部分失敗時も常に200を返し、障害が誰にも見えなかった

- **問題**: `src/app/api/cron/notifications/route.ts`は、`notification_log`書き込み失敗やプッシュ送信失敗(`result.errors`)が発生していても、常に`{success:true}`とHTTP 200を返していた。リポジトリ全体にSentry等のエラートラッキングが一切導入されておらず(grep済み、0件)、この振る舞いだとプッシュ配信の障害が完全に無音になり、Vercel Cronの失敗検知(非2xxベース)も運用者への通知ログも機能しなかった。
- **対応状況**: 対応済み。`result.errors`が1件以上ある場合は`console.error`でログを残した上でHTTP 500(`success:false`)を返すよう変更。既存の成功系テスト(空データセット、エラー0件)は500への変更の影響を受けないことを確認済み。

## 監査したが問題が見つからなかった主な領域(5巡目)

- オープンリダイレクト・CRON_SECRET fail-closed・タイミングセーフ比較・RLS全テーブル・service-role鍵の非露出・アカウント削除時のStorage削除順序・JST日付境界・`updateSchedule`の競合検知・safeQueryLimits・エラーバウンダリ・LoadErrorBanner・contrast(text-zinc-500/600の残存なし)・44pxタップ領域(実インタラクティブ要素)・フォームのhtmlFor/aria結線・アカウント削除ダイアログのフォーカストラップ・チャートのdynamic import・動画アップロードの進捗/キャンセル/ObjectURL解放・TODO/FIXME/console.log/any の残存なし: いずれも現在のコードを直接読んで再検証し、記録通りであることを確認した。
- `video_analyses.match_id`の所有権チェック漏れ(P2、他の子テーブルにあるenforce_video_analysis_ownershipトリガーがこの列にはない)を新規発見したが、現状これを悪用する読み取り経路はコード上存在せず影響は限定的なため、一覧化のみで見送り。

## P2/P3(今回は一覧化のみ、修正なし)

| 問題 | 該当ファイル | 種別 |
| --- | --- | --- |
| `video_analyses.match_id`に他テーブルと同等の所有権検証トリガーがない(現状悪用経路なし) | `supabase/schema.sql` | P2 |
| cronの`no_record_reminder`が`maybeSingle()`の多重行エラーを握りつぶし、同日に複数試合を記録した場合に誤ったリマインドが送られ得る | `src/app/api/cron/notifications/route.ts` | P2 |
| Service Workerが非2xxレスポンスもキャッシュしてしまう | `public/sw.js` | P2 |
| ネイティブ`alert()`/`confirm()`が6箇所以上残存(アカウント削除のみカスタムダイアログ化済み) | `schedule/new`, `schedule/[id]/edit`, `matches/[id]`, `matches/[id]/edit`, `page.tsx`, `video-analysis/[id]` | P2 |
| 通知許可の初回リクエストに事前説明がなく、拒否後は二度と促されない | `NotificationPermissionPrompt.tsx` | P2 |
| ホーム画面の予定・年間目標・未読件数の取得失敗が`console.error`のみでUI表示に出ない(同ページの試合データ取得は`LoadErrorBanner`で表示される一貫性の欠如) | `src/app/page.tsx` | P3 |
| `updateMatch`の競合時、日本語の案内でなく生のPostgrestエラーメッセージが表示される | `src/app/matches/[id]/edit/page.tsx` | P3 |
| 日付フォーマット・月キー生成・ミリ秒/日の重複実装が数箇所に残る | `matches.ts`/`schedules.ts`/`coach/period.ts`/`coach/keywordTrend.ts`/`schedulePreview.ts`/各種`formatDate`ローカル実装 | P3 |
| `src/app/report/page.tsx`が863行と最大で、プレゼンテーション・データ取得・ビジネスロジックが混在 | `src/app/report/page.tsx` | P3 |
| 認証ガード(「ログインが必要です」)16箇所・quota超過を返す`videoAnalyses.ts`にテストがない | `src/lib/*.ts` | P2 |
| バックアップ/RPO/RTOの方針がドキュメント化されていない | `docs/supabase-production-verification.md` | P3(文書) |

## テスト

新規テストファイル: `src/lib/notifications/pushEndpoint.test.ts`(6ケース)。既存119件(20ファイル)と合わせて計125件(21ファイル)、全て成功。`npm run lint`・`npx tsc --noEmit`・`npm run build`・`git diff --check`すべて成功を確認済み。

---

# 6巡目監査(2026-07-21実施、商用化前土台強化・round 6)

5巡目までの内容を「最大60点の途中結果」として引き継いだ。開始時点で5巡目の変更(push endpoint SSRF対策等)が未コミットのまま作業ツリーに残っていることをまず確認し、内容がdocsの記録と一致すること・秘密情報を含まないこと・lint/型チェック/テスト125件/buildが全て成功することを検証したうえで、安全なチェックポイントとして先にコミットした。今回は新機能の無計画な追加ではなく、商用サービスとして公開する前の土台(動画保存コスト対策・ホーム画面の情報設計・運用ドキュメント)を優先して監査・実装した。

## 実装(P2相当・ロードマップ必須項目)

### 原動画の保持期限削除・孤立アップロード対策の土台

- **問題**: ロードマップの「動画は一時保存→解析→結果保存→一定期間後に原動画削除」という方針に対し、実装は「アップロード→解析→無期限保存」のままだった。孤立アップロード(Storageへのアップロードは成功したが、ブラウザが閉じる等で`video_analyses`行の作成前に処理が中断したファイル)を検出・削除する仕組みも存在しなかった。将来的にユーザー数・動画数が増えると、Storage容量・コストが無制限に増加するリスクがある。
- **対応状況**: 判定ロジックと実行エンドポイントの土台を実装(**本番での自動実行は有効化していない**)。
  - `src/lib/video-analysis/retention.ts`: 完了済み解析(`completed`/`completed_insufficient_quality`)がプランごとの`retention_days`を超えたら原動画の削除対象と判定する純粋関数。`failed`(再試行が原動画を必要とする)・進行中・既に削除済みの行は対象外。単体テスト9ケース。
  - `src/lib/video-analysis/orphanUploads.ts`: Storage上にあるが対応するDB行がないファイルを検出する純粋関数。アップロード直後の誤検出を防ぐため24時間の猶予期間を設定。単体テスト5ケース。
  - `src/lib/video-analysis/videoMaintenance.ts`/`videoMaintenanceDeps.ts`: 上記の判定をStorage/DBへのI/Oに繋げる実行層。Supabase依存を`videoMaintenanceDeps.ts`側に分離し、`videoMaintenance.ts`はテスト時にSupabase(`server-only`)を一切importしなくて済むようにした。dry-run対応・エラーは個別に収集して次回再試行可能な状態を保つ(Storage削除成功後にDB更新が失敗した場合も、次回はすでに存在しないファイルへの削除がSupabase Storageでは成功扱いになるため無限リトライにならない)。単体テスト11ケース。
  - `POST /api/cron/video-maintenance`(新規): `/api/cron/notifications`と同じfail-closedな`CRON_SECRET`認証+レート制限。**既定で`dryRun=true`**(明示的に`?dryRun=false`を指定しない限り何も削除しない)。`vercel.json`の`crons`には**意図的に未登録**(実データの動画を不可逆的に削除するため、自動スケジュール実行の有効化は運営者の判断に委ねた)。単体テスト6ケース。
  - `supabase/migrations/20260721_add_video_retention.sql`(新規、**本番未適用**): `plan_limits.retention_days`(free=30日・pro=90日・admin=無期限を提案値として追加)・`video_analyses.original_video_deleted_at`。`supabase/schema.sql`にも同内容を反映済み。
  - `src/lib/supabase/storageCleanup.ts`に読み取り専用の再帰リスト関数`listAllFilePaths()`を追加(孤立ファイル検出用)。実装中、バケットルート(空prefix)から呼んだ場合にパスの先頭に不要な`/`が付く既存パターンのバグを発見・修正(この関数は新規追加のため実害はなし)。
  - 運用手順書 `docs/video-retention-ops.md`(新規)を作成し、有効化する場合の具体的な手順(migration適用→retention_days確認→dry-run実行→本番実行→cron登録)とdry-run結果の確認方法を明記。`docs/known-limitations.md`にも要約を追記。

## PHASE3: ホーム画面の情報設計整理

- **問題**: ホーム画面(`src/app/page.tsx`)が単一の縦スクロールに約20セクションを均等な重みで積み上げる構成になっており、ロードマップが最優先とする「素早い記録追加ボタン」(`RecordEntryPoints`)が画面最下部に配置されていた。詳細な統計(月別試合数・自己評価推移・ポジション割合・キーワードランキング)も常時全展開されており、情報量が多すぎた。
- **対応状況**: 対応済み(既存デザイン・機能は維持し、配置と表示段階のみ変更)。
  - `RecordEntryPoints`(⚡30秒で記録する/詳しく記録する)を、通知状況・今日のReflog・AIアドバイスの直下(画面上部)に移動。画面下部にあった重複配置は削除。
  - 月別試合数グラフ・自己評価平均・自己評価推移グラフ・ポジション割合・よく使うキーワードを、新規の`src/components/Accordion.tsx`(ネイティブ`<details>/<summary>`ベース、JS状態管理なし・キーボード操作可能・`prefers-reduced-motion`と衝突しない)でまとめ、「📊 詳細な統計を見る」の下に折りたたみ表示にした。
- **残る課題**: ブラウザでの実機確認は本セッションでは実施できていない(このsandbox環境にブラウザ操作ツールがなく、ホーム画面は認証必須ページのためcurlでの表示確認もできない)。`npm run build`による静的プリレンダー成功・型チェック・lintの通過は確認済みだが、視覚的な確認は次回、実際にログインできる環境で行うことを推奨する。

## 追加監査(発見に至らず・既存対応を再確認)

- `TODO`/`FIXME`/`HACK`/裸の`@ts-ignore`/実質的な`any`/`console.log`: 引き続き0件。
- `eslint-disable`: 5箇所すべて既存の妥当な理由によるもの(確認済み、変更なし)。
- 秘密鍵・Service Role Key・VAPID秘密鍵のクライアント露出: なし(server-onlyファイルのみで使用)。
- 法的ページの連絡先メールアドレス: 運営者本人の実アドレスであり、ダミー事業者情報の記載なし。
- 壊れた動画・0バイト動画のアップロード: `extractVideoMetadata`が`loadedmetadata`イベントを待ち、失敗時(`error`イベントまたは15秒タイムアウト)は例外を投げてアップロード処理自体を中止する設計を確認(既存実装、今回変更なし)。
- ネイティブ`alert()`/`confirm()`の残存(7箇所): 5巡目で発見済み・P2として一覧化済みの項目と一致することを再確認。今回も未対応(視覚確認を伴うUI変更のため見送り、次回優先課題とする)。

## テスト

新規テストファイル: `src/lib/video-analysis/retention.test.ts`(9ケース)・`src/lib/video-analysis/orphanUploads.test.ts`(5ケース)・`src/lib/video-analysis/videoMaintenance.test.ts`(11ケース)・`src/app/api/cron/video-maintenance/route.test.ts`(5ケース)。既存の`src/lib/supabase/storageCleanup.test.ts`に3ケース追加。既存160件(25ファイル)全て成功。`npm run lint`・`npx tsc --noEmit`・`npm run build`すべて成功を確認済み(詳細は本ラウンドの最終報告を参照)。

---

# Round 7(2026-07-21実施、RC-1向けP0是正)

Round 6までの内容を「最大60点の途中結果」として引き継いだ。今回はREFLOGを「限定ユーザーへ安心して提供できるRelease Candidate 1」に引き上げることを目的とし、新機能追加は一切行わず、指示されたP0項目を優先順位どおり実施した。

## P0-1: ネイティブ `alert`/`confirm` の全廃

- **問題**: Round 5・6で発見済みだったが未対応のまま残っていた `window.alert`/`window.confirm` が6ファイル・10箇所に残存していた(`src/app/page.tsx`・`src/app/matches/[id]/page.tsx`・`src/app/matches/[id]/edit/page.tsx`・`src/app/schedule/[id]/page.tsx`・`src/app/schedule/new/page.tsx`・`src/app/schedule/[id]/edit/page.tsx`・`src/app/video-analysis/[id]/page.tsx`)。ネイティブダイアログはスタイルを統一できず、フォーカストラップ・aria属性・モバイルでのレイアウト崩れ防止がブラウザ任せになる。
- **対応**: `src/components/ConfirmDialog.tsx`(新規)を、既存の `src/app/settings/page.tsx` にあったアカウント削除確認モーダルの実装(role="dialog"・aria-modal・フォーカストラップ・Escapeクローズ・クローズ時のフォーカス復帰)を汎用化する形で作成。destructive操作は赤系ボタン、削除対象名(`targetName`)を表示できる設計にした。`settings/page.tsx` 自身もこの共通コンポーネントを使うようリファクタし、重複実装を解消。6ファイルすべての `window.confirm`/`window.alert` をこのダイアログ、または既存の `queueToast`(成功時のトースト表示)に置き換えた。
- **副次的に発見・修正したバグ**: `queueToast()` はsessionStorageにメッセージを積むだけで、**ホーム画面(`src/app/page.tsx`)でしか表示されていなかった**。そのため `matches/[id]/edit` や `schedule/new` 等、ホーム以外の画面へ遷移する保存・更新操作の成功トーストは、ユーザーがたまたま後でホームへ戻るまで表示されないか、無関係なタイミングで突然表示される不具合があった。`src/components/Toast.tsx` に `GlobalToast`(`useQueuedToast`を内包)を追加し、`src/app/layout.tsx`(ルートレイアウト)に配置することで、どの画面に遷移してもキューされたトーストが即座に表示されるよう修正した。ホーム画面の個別マウントは削除。
- **検証**: `grep`で `alert(`/`confirm(`/`window.alert`/`window.confirm` の残存が0件であることを確認。Playwright E2Eで実際にダイアログの表示・Escapeクローズ・削除実行・トースト表示を検証(下記)。

## P0-2: Playwright E2Eテストの追加

- **背景**: Round 2の監査では「認証を伴うE2Eにはテスト専用Supabaseプロジェクトが必要」として見送られたまま、Round 6まで未着手だった。
- **対応**: `@playwright/test` を新規に開発依存として追加(`npm install -D @playwright/test`、chromiumのみインストール)。`playwright.config.ts` で以下を実装:
  - 認証不要の `public-*` プロジェクト(4ビューポート: 360×800 / 390×844 / 768×1024 / 1440×900)。常に実行される。
  - 認証必須の `authed-*` プロジェクトは、環境変数 `E2E_TEST_USER_EMAIL`/`E2E_TEST_USER_PASSWORD` が**両方設定されている場合のみ登録**される設計。本番コードには一切テスト用の認証バイパスを追加していない(`src/proxy.ts` の `supabase.auth.getUser()` によるサーバー側検証はそのまま)。認証は実際のUIからログインし、Playwrightの`storageState`に保存して再利用する標準パターン(`tests/e2e/auth.setup.ts`)。
  - Next.js 16は同一プロジェクトディレクトリで `next dev` の多重起動をロックファイルで拒否する仕様(訓練データにない挙動、`AGENTS.md`の警告どおり)であることが実行時に判明したため、既存の開発サーバー(ポート3000)を`reuseExistingServer: true`で再利用する設定に変更した。
- **実装したテスト**:
  - `tests/e2e/public/protected-routes.spec.ts`: 未認証で `/`・`/matches`・`/schedule`・`/video-analysis`・`/settings`・`/notifications` にアクセスすると `/login` へリダイレクトされること。未知のURLも同様(クラッシュせず`/login`へ)。
  - `tests/e2e/public/login.spec.ts`: ログイン画面表示・不正ログイン時のエラー表示・新規登録切り替え・レスポンシブ(横スクロールなし・送信ボタン44px以上)。
  - `tests/e2e/public/not-found.spec.ts`: 未認証時の未知URLアクセス、利用規約・プライバシーポリシーの表示。
  - `tests/e2e/authed/home.spec.ts`・`quick-entry.spec.ts`・`schedule.spec.ts`・`notifications.spec.ts`・`video-analysis.spec.ts`・`not-found.spec.ts`: ホーム画面表示、クイック記録の作成→詳細表示→ConfirmDialogでの削除(二重送信防止ボタン文言変化を含む)、スケジュールの追加→詳細→編集→削除(Escapeで閉じてキャンセルされることも検証)、通知設定画面、動画分析画面のデモ免責表示、300MB超の動画ファイル選択時のエラー表示、非対応形式のエラー表示、認証済み状態での404ページ表示。
- **実行結果**: `public-*` は4ビューポート×13ケース=52件、全件成功を確認済み。`authed-*` は**このセッションでは実行確認できていない**(テスト専用Supabaseプロジェクトが用意されていないため — 本番プロジェクトを使った実行は指示により実施していない)。詳細と有効化手順は `tests/e2e/README.md`。

## P0-3: 保存・更新・削除・アップロード失敗時のUX統一

- ConfirmDialog化の過程で、削除失敗時のエラー表示をすべて既存の `role="alert" aria-live="assertive"` パターンに統一した(以前は一部が `window.alert` で表示されていた)。
- **新規発見・修正**: ホーム画面の「今後の担当試合」セクションは、Supabaseからの取得が失敗した場合も `schedules` が初期値の空配列のままとなり、「まだ予定が登録されていません。」という**空状態と同じ表示**になっていた(Round 3で他の同種箇所は修正済みだったが、この箇所は対象漏れだった)。専用の `schedulesLoadError` state を追加し、取得失敗時は「予定の取得に失敗しました。通信環境をご確認のうえ、ページを再読み込みしてください。」という専用メッセージを表示するよう修正。
- 上記以外のエラーハンドリング(401セッション切れ・404・409相当の競合・413相当のサイズ超過・429レート制限・500・オフライン)は、Round 3〜6で整備済みの「日本語の統一メッセージ+再試行導線+セッション切れ時の別タブログイン導線」パターンが引き続き機能していることをコードレビューで再確認した(新規のステータスコード別の出し分けは追加していない — 既存の「原因を問わず再試行を促す」フォールバック設計を踏襲)。

## P0-4: 動画デモ分析の誤認防止 再監査

- `/video-analysis`(一覧)・`/video-analysis/new`(アップロード)・`/video-analysis/[id]/processing`(処理中)・`/video-analysis/[id]`(結果)・ホーム画面のティーザーカードのすべてで `DemoDisclaimerBanner` が表示されていることをコードから直接再確認した。
- `CoachingSummaryCard`・`EvidenceCard` はいずれも `UncertaintyCard`(根拠・限界を明示するコンポーネント)を併設しており、AIが実際にプレーを認識したと断定する表現・判定精度を主張する表現は見つからなかった。Round 5・6の監査結果と一致。**今回のコード変更はなし(再検証のみ)**。

## P0-5: アカウント削除・データ削除の設計監査

- `src/app/api/account/delete/route.ts` と `docs/data-deletion.md` を照合し、Storageクリーンアップ→authユーザー削除の順序・失敗時のロールバック挙動(DBは削除しない)・レート制限・ログにPIIを出力しないことを再確認した(記述と実装が一致)。
- **新規発見**: アプリ内でのメールアドレス変更・パスワード変更(ログイン中のユーザー向け)が実装されていないことを確認した。パスワードの「忘れた場合」の再設定フローのみ存在する。危険な中途半端実装を避け、`docs/known-limitations.md` に設計時の注意点(再認証要件)とともに記録した。
- 設定画面に「お問い合わせ」の直接導線がなかった(プライバシーポリシー内にのみ連絡先メールがあった)ため、`src/lib/contact.ts`(新規、`CONTACT_EMAIL`の単一情報源)を作成し、`privacy`・`terms`ページの重複定義を統合したうえで、`src/app/settings/page.tsx` に直接の「お問い合わせ」行(mailto:リンク)を追加した。架空の会社名・住所・電話番号は追加していない。

## P0-6: 本番migrationと動画保持機能の安全な適用手順

- `docs/video-retention-ops.md` に以下を追記した: dry-runレスポンスの具体例(JSON)、SQLによる削除候補の直接検証方法、本実行前チェックリスト(6項目)、ロールバック不能である旨の明示的な警告、cronを停止する手順、障害時の対応手順、Storage使用量を定期確認する運用手順。
- コードを再確認し、「削除件数上限」(purge対象は1回あたり最大500件、`videoMaintenanceDeps.ts`の`.limit(500)`)・「prefix境界での一括削除がなく1件ずつ特定済みの対象のみ削除される」設計・「GETでも同じCRON_SECRET認証を通らない限り削除されない」ことを確認し、文書に反映した(コード変更はなし、既存の安全設計を正確に文書化)。

## P0-7: エラー監視・運用監視の導入可能な構造整備

- `src/lib/observability/errorReporter.ts`(新規)を追加し、`src/app/error.tsx`・`src/app/global-error.tsx` の `console.error` 呼び出しをこの関数経由に統一した。Sentry等を導入する際はこの関数の中身を差し替えるだけで済む設計。
- `docs/observability.md`(新規)に、Sentry導入手順・送信してはいけないデータ(動画URL・認証トークン・自由記述欄の本文・個人情報)・DSN未設定時にアプリが壊れないための設計要件・開発環境での送信抑制・source mapの扱い、および運用指標10項目それぞれの現在の取得元を整理した。
- `.env.local.example` に `NEXT_PUBLIC_SENTRY_DSN`(未使用・将来用のプレースホルダとして明記)を追記した。

## P1/P2(文書化のみ、実装は見送り)

- `docs/billing-architecture.md`(新規)を作成。`supabase/schema.sql` を直接読み、`plan_type`は`protect_profile_plan_columns`トリガーにより`service_role`/`postgres`以外からの変更が拒否されること、`plan_limits`はSELECTのみのRLSで単一の情報源として保護されていること、`admin`プランが`monthly_analysis_limit`/`retention_days`とも`null`(無制限)であることを実際のスキーマ定義から確認・記録した。決済失敗時の状態・解約後の扱い・プラン降格時の動画保持・webhookの冪等性・二重課金防止は未設計であることを明記し、実装順序を提案した。
- 本物のAI動画分析・FIBAルールQA・App Store対応については、依存境界と前提条件のみを同文書に記録し、実装は行っていない。

## テスト

新規テストファイルの追加はなし(今回はUIコンポーネントの置き換え・E2Eインフラ整備・ドキュメント整備が中心で、既存の単体テスト対象範囲に実質的な変更はなかったため)。既存160件(25ファイル)は全て成功を維持。`npm run lint`・`npx tsc --noEmit`・`npm run build`・Playwright `public-*`(52件)の実行結果は最終報告(会話内)を参照。
