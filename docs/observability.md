# エラー監視・運用監視(round 7時点)

## 現状

外部のエラートラッキングサービス(Sentry等)は**導入していません**。理由は、Sentry等の
利用には運営者自身によるアカウント作成・DSN発行が必要で、このセッションからは実施できな
いためです(「外部サービスへの勝手な登録」は禁止操作)。

代わりに以下を用意しました。

- `src/lib/observability/errorReporter.ts`: エラー報告用の薄いラッパー関数
  `reportError(error, context)`。現状は `console.error` を呼ぶだけですが、呼び出し側は
  この関数だけに依存しているため、将来Sentryを導入する際は**この関数の中身を差し替える
  だけ**で全呼び出し箇所に反映できます。
- `src/app/error.tsx` / `src/app/global-error.tsx`(クライアント側の未処理例外を捕まえる
  Next.jsのエラーバウンダリ)は、この `reportError()` 経由でログを出すよう統一済みです。
  外部トラッカーを導入する際にSentryの `captureException` を差し込む最有力ポイントです。
- API Route(`/api/cron/notifications`・`/api/cron/video-maintenance`・
  `/api/account/delete`・`/api/video-analysis/[id]/analyze`)は、失敗時に必ず非2xxを返す
  設計(fail-visible)になっており、Vercelの標準ログ・Cron失敗検知だけでも異常に気づける
  ようにしてあります。

## Sentry導入時の手順(運営者が実施する場合)

1. https://sentry.io で新規プロジェクトを作成し(Next.js向け)、DSNを取得する。
2. `npm install @sentry/nextjs` を実行し、`npx @sentry/wizard@latest -i nextjs` を実行す
   る(公式ウィザードが `instrumentation.ts`・`sentry.*.config.ts`・`next.config.ts` の
   ラップを自動生成します)。**このリポジトリはNext.js 16という比較的新しいバージョンを
   使っているため、ウィザード実行後は必ず `npm run build` が通ることを確認してください。**
3. 環境変数を設定する(Vercelのプロジェクト設定、および `.env.local`):
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
   SENTRY_AUTH_TOKEN=...   # source map アップロード用、サーバー/CIのみに設定しコミットしない
   SENTRY_ORG=...
   SENTRY_PROJECT=...
   ```
   `NEXT_PUBLIC_SENTRY_DSN` が未設定の環境(ローカル開発・このリポジトリの標準状態)では
   Sentry SDK自体を初期化しない分岐を必ず入れること(DSN未設定でもアプリが壊れないこと
   が要件)。
4. `src/lib/observability/errorReporter.ts` の `reportError()` の中身を
   `Sentry.captureException(error, { extra: context })` に差し替える。
5. **送信してはいけないデータ**(このアプリ固有の注意点):
   - 動画のStorage署名付きURL・`storage_path`
   - 認証トークン・Cookie・`Authorization` ヘッダーの値
   - 試合記録・スケジュールの自由記述欄(`goodPoints`・`improvements`・`nextGoal`・
     `memo` 等)の本文
   - メールアドレス・ユーザー名などの個人情報(Sentryの `beforeSend` フックで
     `event.user` を送らない、または匿名化したユーザーIDのみに絞ること)
   - 上記はSentryの `beforeSend`/`beforeSendTransaction` フックで機械的にフィルタする
     ことを推奨します(手動での送信箇所ごとの気配りに依存しない設計にする)。
6. 開発環境(`NODE_ENV=development`)では送信しない設定にする(Sentryの `enabled` オプ
   ションを `process.env.NODE_ENV === "production"` 等で制御)。
7. source mapは「アップロードするがpublicには公開しない」設定(Sentryウィザードの既定
   動作)を維持し、`next.config.ts` に生成物を出力させたままVercelへコミットしないこと
   (`.gitignore` で除外されることを確認)。

導入後は本ファイルの「現状」セクションを更新してください。

## 監視すべき運用指標(現時点でどこから拾えるか)

外部ダッシュボードがない前提で、それぞれ「今のコードのどこにその情報があるか」を示します。

| 指標 | 現在の取得元 |
| --- | --- |
| API 5xx | 各Route Handlerが返すHTTPステータス(Vercel Function Logsで `status >= 500` をgrep) |
| cron失敗(通知・動画メンテナンス) | `/api/cron/notifications`・`/api/cron/video-maintenance` は失敗時に必ずHTTP 500を返す設計。Vercel Cronの実行履歴(非2xx)で検知可能 |
| 動画削除候補数 | `/api/cron/video-maintenance` のdry-runレスポンス `purge.eligible` / `orphans.found`([`docs/video-retention-ops.md`](./video-retention-ops.md)参照) |
| 動画削除成功数・失敗数 | 同エンドポイントの `purge.purged` / `purge.errors` / `orphans.removed` / `orphans.errors` |
| 孤立ファイル数 | 同エンドポイントの `orphans.found` |
| 通知送信失敗 | `/api/cron/notifications` のレスポンス `errors` 配列、および `notification_log` テーブル(Supabase SQL Editorで `status = 'failed'` を集計) |
| Storage使用量 | Supabaseダッシュボード → Storage → Usage(手動確認。[`docs/video-retention-ops.md`](./video-retention-ops.md)の「Storage使用量を定期確認する運用手順」参照) |
| 認証エラー急増 | 現時点では専用の集計はなし。Vercel Function Logsで各Route Handlerが返す401件数を目視確認するか、Sentry導入後は `reportError` 経由で件数を追える |
| build失敗 | Vercelのデプロイ通知(標準機能、追加設定不要) |
| 利用上限到達(動画解析の月間上限) | クライアント側は `src/lib/video-analysis/planUsage.ts` の `canStartAnalysis`。DB側は `enforce_video_analysis_quota` トリガーが物理的に阻止。集計するには `video_analyses` を月・ユーザーで集計するSQLをSupabase側で都度実行する必要がある(専用ダッシュボードは未整備) |

上記のうち「Supabase SQL Editorで手動確認」に依存している項目は、利用者数が増えた場合に
スケールしません。Sentry(エラー系)に加えて、Supabaseの `pg_cron` + 集計テーブル、また
は外部のBIツール接続を将来検討してください(いずれも今回は未着手・運営者判断)。
