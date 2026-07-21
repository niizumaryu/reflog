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

## dry-runレスポンス例

`action`未指定(既定`both`)の場合、purge(保持期限切れ)とorphans(孤立ファイル)の両方が実行されます。実際の呼び出し例(dry-run、何も削除されません):

```
curl -s -X POST "https://<本番ドメイン>/api/cron/video-maintenance" \
  -H "Authorization: Bearer $CRON_SECRET" | jq
```

レスポンス例(該当ゼロの場合):

```json
{
  "success": true,
  "dryRun": true,
  "purge": { "dryRun": true, "checked": 0, "eligible": 0, "purged": 0, "errors": [] },
  "orphans": { "dryRun": true, "scanned": 0, "found": 0, "removed": 0, "errors": [] }
}
```

該当ありの場合(例):

```json
{
  "success": true,
  "dryRun": true,
  "purge": { "dryRun": true, "checked": 42, "eligible": 5, "purged": 0, "errors": [] },
  "orphans": { "dryRun": true, "scanned": 130, "found": 2, "removed": 0, "errors": [] }
}
```

- `dryRun: true` のときは `purged` / `removed` は常に `0` です(判定のみ実施し、削除APIは一切呼びません)。
- `checked` はpurge対象クエリでヒットした行数(下記の上限つき)、`eligible` がそのうち実際に保持期限を過ぎている件数です。
- `errors` が空配列であることを確認してから本実行に進んでください。

## 削除候補の検証方法(本実行前)

dry-runの `eligible` / `found` 件数が想定と大きく違う場合は、本実行の前にSupabase SQL Editorで個別に確認してください。

```sql
-- purge対象になりうる行(completed/completed_insufficient_qualityかつ未削除)を実際に列挙
select id, user_id, status, created_at, storage_path
from public.video_analyses
where original_video_deleted_at is null
  and status in ('completed', 'completed_insufficient_quality')
order by created_at asc
limit 50;

-- ユーザーごとのretention_days(プラン別)
select plan_type, retention_days from public.plan_limits;
```

孤立ファイル(`orphans.found`)は、Supabase StorageダッシュボードでバケットREST一覧と `video_analyses.storage_path` を目視突合することでも検証できます。

## 本実行前チェックリスト

本実行(`dryRun=false`)は**不可逆**です。削除された原動画ファイルはバックアップがない限り復元できません。以下を全て満たしてから実行してください。

- [ ] `supabase/migrations/20260721_add_video_retention.sql` が対象のSupabaseプロジェクトに適用済み([`docs/supabase-production-verification.md`](./supabase-production-verification.md)の手順で確認)
- [ ] `plan_limits.retention_days` の値が意図通り(free/pro/adminそれぞれ)
- [ ] 直前のdry-run実行で `errors` が空
- [ ] dry-runの `eligible` / `found` 件数を人間が目視確認し、想定外に多くない(例: 普段の実行より1桁多い、など)ことを確認した
- [ ] `NEXT_PUBLIC_SUPABASE_URL` が本番プロジェクトを指していることを再確認した(テスト用プロジェクトへの誤実行を避けるため)
- [ ] 実行者が `CRON_SECRET` を安全な方法(環境変数・シークレットマネージャ)から取得しており、コマンド履歴やチャットにそのまま貼り付けていない

**⚠️ ロールバック不能の警告**: `dryRun=false` を付けた時点で、対象のStorageファイルは即座に削除されます。データベース側にゴミ箱・論理削除・世代管理はありません。誤って本実行した場合、Supabase側のバックアップ(Point-in-Timeリカバリ等、有料プランでのみ利用可)がなければ復元できません。

## 再試行・失敗時の扱い

- Storage削除が失敗した行は `original_video_deleted_at` を更新しないため、次回実行時に自動的に再試行対象になります。
- Storage削除は成功したがDB更新が失敗した場合、次回実行時に同じファイルへの削除を再試行します(既に存在しないファイルへの `remove()` はSupabase Storageでは失敗ではなく成功として扱われるため、無限リトライにはなりません)。
- 孤立ファイル削除も同様に、削除失敗は次回実行時に再検出・再試行されます。
- `errors` が1件でもあるレスポンスはHTTP 500を返します(`/api/cron/notifications` と同じ方針)。Vercel Cronの失敗検知や、任意で導入する外部モニタリングでこれを拾ってください。現時点でSentry等のエラートラッキングは未導入です([`docs/known-limitations.md`](./known-limitations.md)、[`docs/observability.md`](./observability.md)参照)。

## 削除件数上限・実行時間・対象範囲(既存の安全設計)

- **1回の実行あたりのpurge対象は最大500件**(`src/lib/video-analysis/videoMaintenanceDeps.ts` の `fetchPurgeCandidateRows` に `.limit(500)`)。対象が500件を超える場合は複数回の実行に分かれます(未処理分は次回実行で自動的に再度対象になります)。
- 孤立ファイル検出(`listAllFilePaths`)は `match-videos` バケット全体を再帰的に列挙します。バケットが非常に大きい場合、1回の実行時間がその分伸びる点に注意してください(明示的なタイムアウト設定はVercelの関数実行時間上限に依存します)。
- 削除はすべて「1件ずつ、事前に特定済みのStorageパス・DB行ID」に対してのみ行われ、prefixやワイルドカードでの一括削除は一切行いません(`videoMaintenance.ts` 冒頭コメント参照)。そのため、候補選定ロジックにバグがあっても「対象外のユーザーの動画を巻き込んで削除する」経路は構造的に存在しません。
- 認証は `CRON_SECRET` の完全一致(定時間比較)のみで許可され、GET/POSTどちらでも同じ認証チェックを通過しない限り実行されません(GETでの無認証削除は不可)。

## cronを有効化した後、停止する手順

いったん `vercel.json` に登録したcronを止めたい場合:

1. `vercel.json` の `crons` 配列から `/api/cron/video-maintenance` の項目を削除する。
2. デプロイする(Vercelは `vercel.json` の内容でcron登録を同期するため、次のデプロイで自動的に解除されます)。
3. 念のため、直接エンドポイントを叩かれても実行されないようにしたい場合は `CRON_SECRET` をローテーションする(この場合 `/api/cron/notifications` も同じ secret を使っているため、両方の呼び出し元を更新する必要があります)。

即座に止めたい(次のデプロイを待てない)場合は、Vercelのプロジェクト設定でCron Jobsを個別に無効化できます(Vercelダッシュボード → Project → Settings → Cron Jobs)。

## 障害時手順

cronの実行が失敗した(HTTP 500 / errorsが空でない)ことに気づいた場合:

1. VercelのFunction Logsで `[cron/video-maintenance]` のログを確認し、`errors` 配列の内容(失敗したStorageパス・行ID)を特定する。
2. 個々のエラーは「次回実行時に自動再試行される」設計のため、単発の一時的エラー(Storage側の一時的な5xx等)であれば、通常は放置して次回実行を待って問題ありません。
3. 同じエラーが連続して繰り返される場合は、dry-runで再実行し、対象行・ファイルを個別にSupabase側で確認する(上記「削除候補の検証方法」参照)。
4. 原因が特定できない、または大量のエラーが継続する場合は、`vercel.json` からcron登録を一時的に外し(上記「停止する手順」)、コードの問題を切り分けてから再度有効化する。
5. 万一、意図しないファイルが削除されたと疑われる場合は、直ちにcronを停止し、Supabase側のバックアップ/PITR(有料プランのみ)からの復旧可否をSupabaseサポートに確認する。このリポジトリの操作だけでは削除済みStorageファイルを復元する手段はない。

## Storage使用量を定期確認する運用手順

保持期限削除を有効化しない(または有効化後も)場合、Storage使用量が無制限に増える可能性があるため、月1回を目安に以下を確認することを推奨します。

1. Supabaseダッシュボード → Project → Storage → 使用量(Usage)で `match-videos` / `profile-icons` バケットの合計サイズを確認する。
2. プロジェクトのプラン上限(Freeプランは1GBなど、プランにより異なる)に対してどの程度の余裕があるか確認する。
3. 上限に近づいている場合、`docs/video-retention-ops.md` の手順で保持期限削除(dry-run→本実行)を実施するか、`plan_limits.retention_days` をより短く調整することを検討する。
4. 併せて `POST /api/cron/video-maintenance`(dry-run)を実行し、`orphans.found` が継続的に増えていないか確認する(増え続けている場合、アップロードが完了しないまま失敗するケースが多い可能性があり、アップロードフロー側の調査が必要)。

## 実施しなかったこと(意図的)

- 本番Supabaseへのmigration適用は行っていません。
- `vercel.json` への自動cron登録は行っていません。
- 実データに対する `dryRun=false` 実行は行っていません。
- 上記はすべて、実データを扱う不可逆的な削除を伴うため、運営者の判断とタイミングに委ねています。
