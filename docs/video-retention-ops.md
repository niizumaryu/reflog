# 動画ストレージ運用手順書(保持期限・孤立ファイル対策)

2026-07-21実施の監査(round 6)で追加。`/api/cron/video-maintenance` を安全に導入するための手順です。**この文書が存在する時点では何も自動実行されていません** — 実際に有効化するかどうかは運営者の判断です。

## 何をするものか

1. **原動画の保持期限削除**: `video_analyses` が `completed` / `completed_insufficient_quality` で完了してから、そのユーザーのプラン(`plan_limits.retention_days`)で決めた日数が経過したら、Storage上の原動画ファイルのみを削除します。解析結果(`analysis_quality_metrics` / `analysis_events` / `coaching_results` / `analysis_feedback`)や `video_analyses` 行自体は削除しません。判定ロジックは [`src/lib/video-analysis/retention.ts`](../src/lib/video-analysis/retention.ts)(純粋関数、単体テスト済み)。
2. **孤立アップロードの検出・削除**: `match-videos` バケット内にあるが、対応する `video_analyses` 行が存在しないファイル(アップロード直後にブラウザが閉じた等)を検出します。誤って処理中のアップロードを消さないよう、最終更新から24時間以上経過したファイルのみが対象です。判定ロジックは [`src/lib/video-analysis/orphanUploads.ts`](../src/lib/video-analysis/orphanUploads.ts)。

実行の組み立て(Storage/DBへの実際のI/O)は [`src/lib/video-analysis/videoMaintenance.ts`](../src/lib/video-analysis/videoMaintenance.ts) と [`videoMaintenanceDeps.ts`](../src/lib/video-analysis/videoMaintenanceDeps.ts)、エンドポイントは [`src/app/api/cron/video-maintenance/route.ts`](../src/app/api/cron/video-maintenance/route.ts) です。

## 現在の状態(重要)

- **`vercel.json` の `crons` には登録していません。** `/api/cron/notifications` と異なり、このエンドポイントは実データの動画ファイルを不可逆的に削除するため、自動スケジュール実行を今回の監査だけで有効化しませんでした。
- `plan_limits.retention_days` は migration適用時に free=30日・pro=90日で自動的に埋まりますが、**migrationを適用しない限りこの値は存在せず**、適用してもエンドポイント自体を呼ばない限り何も削除されません。
- エンドポイントを直接呼び出しても、**`dryRun` は既定で `true`** です。実際に削除するには明示的に `?dryRun=false` を付ける必要があります。

## 有効化する手順(運営者が任意のタイミングで実施)

1. `supabase/migrations/20260721_add_video_retention.sql` を本番Supabaseに適用する(SQL Editorに貼り付けて実行)。適用状況の確認方法は [`docs/supabase-production-verification.md`](./supabase-production-verification.md) を参照。
2. `retention_days` の値を確認・調整する(必要なら):
   ```sql
   select plan_type, monthly_analysis_limit, retention_days from public.plan_limits;
   update public.plan_limits set retention_days = 30 where plan_type = 'free';
   ```
3. まず **dry-run** で呼び出し、削除される予定件数を確認する(何も削除されません):
   ```
   curl -X POST "https://<本番ドメイン>/api/cron/video-maintenance" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   レスポンスの `purge.eligible` / `orphans.found` が実際に対象になる件数です。`errors` が空であることを確認してください。
4. 件数が妥当だと確認できたら、明示的に `dryRun=false` を付けて実行する:
   ```
   curl -X POST "https://<本番ドメイン>/api/cron/video-maintenance?dryRun=false" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
5. 定期実行したい場合のみ、`vercel.json` の `crons` に追記する(例: 毎日1回):
   ```json
   { "path": "/api/cron/video-maintenance?dryRun=false", "schedule": "30 3 * * *" }
   ```
   Vercel Cronは `Authorization` ヘッダーを自動付与しないため、Vercelのcron用の認証設定(Cron Job Secretのプロジェクト設定、または別途のプロキシ)を別途確認してください。**この一文だけで自動的に有効化されるわけではありません** — Vercel側の認証設定が伴わない限り、cronからの呼び出しは401で拒否され続けます(fail-closed設計のため)。

## 再試行・失敗時の扱い

- Storage削除が失敗した行は `original_video_deleted_at` を更新しないため、次回実行時に自動的に再試行対象になります。
- Storage削除は成功したがDB更新が失敗した場合、次回実行時に同じファイルへの削除を再試行します(既に存在しないファイルへの `remove()` はSupabase Storageでは失敗ではなく成功として扱われるため、無限リトライにはなりません)。
- 孤立ファイル削除も同様に、削除失敗は次回実行時に再検出・再試行されます。
- `errors` が1件でもあるレスポンスはHTTP 500を返します(`/api/cron/notifications` と同じ方針)。Vercel Cronの失敗検知や、任意で導入する外部モニタリングでこれを拾ってください。現時点でSentry等のエラートラッキングは未導入です([`docs/known-limitations.md`](./known-limitations.md)参照)。

## 実施しなかったこと(意図的)

- 本番Supabaseへのmigration適用は行っていません。
- `vercel.json` への自動cron登録は行っていません。
- 実データに対する `dryRun=false` 実行は行っていません。
- 上記はすべて、実データを扱う不可逆的な削除を伴うため、運営者の判断とタイミングに委ねています。
