# Supabase 本番反映・確認手順

このドキュメントは、ローカルの `supabase/schema.sql` と `supabase/migrations/*.sql` の内容を、実際の本番Supabaseプロジェクトに反映・確認するための手順です。**このリポジトリのコードだけでは、本番プロジェクトに何がどこまで適用済みかは判断できません。** 必ず本番プロジェクトのSQL Editorやダッシュボードで実際に確認してください。

このセッションでは本番Supabaseへの変更は一切行っていません(指示により禁止されています)。

## 適用が必要なファイル(初回セットアップの場合)

1. `supabase/schema.sql` — 全体スキーマ(冪等・何度実行しても安全)
2. `supabase/migrations/20260716_add_video_analysis.sql` — 動画分析機能(schema.sqlに統合済みのため、schema.sqlを実行済みなら不要)
3. `supabase/migrations/20260717_harden_video_analysis.sql` — 動画分析の運用強化(同上)
4. `supabase/migrations/20260717_secure_function_search_path.sql` — 1巡目監査で追加。トリガー関数に明示的な `search_path` を設定する変更(振る舞いは変わりません)。
5. `supabase/migrations/20260717_add_text_length_constraints.sql` — **2巡目監査で追加・本セッションでは未適用**。`matches`・`schedules`・`profiles`・`video_analyses` の主要な自由入力欄にサーバー側(DB)の文字数上限CHECK制約を追加します。**破壊的変更ではありません**(`not valid` を使っており、既存データは一切検証・変更されません。新規のinsert/updateのみ対象)。

`schema.sql` は上記すべての内容を含む完全な最新版です。**新規プロジェクトなら `schema.sql` を1回実行するだけで足ります。** 既存プロジェクトに個別のmigrationを追加する場合は、上から順に該当ファイルのみを実行してください(4→5の順で、両方とも未適用なら先に4、次に5)。

## 適用前確認SQL(migration 5: 文字数制限)

`20260717_add_text_length_constraints.sql` を適用する前に、念のため既存データに極端に長い値がないか確認しておくと安心です(`not valid` を使うため実際には適用がブロックされることはありませんが、状況把握のために推奨します)。

```sql
select
  max(char_length(competition)) as max_competition,
  max(char_length(good_points)) as max_good_points,
  max(char_length(improvements)) as max_improvements,
  max(char_length(next_goal)) as max_next_goal,
  max(char_length(free_notes)) as max_free_notes
from public.matches;
```

大きな値(数千文字を超えるなど)が出ても、この migration 自体は失敗しません(`not valid` は既存行を検証しないため)。将来 `validate constraint` で既存データも検証したくなった場合にのみ、該当行の扱いを個別に検討してください。

## 実行手順

1. Supabaseダッシュボードにログインし、対象プロジェクトを開く
2. 左メニューの **SQL Editor** を開く
3. **New query** を押す
4. 適用したいファイルの内容を全文コピーして貼り付ける
5. **Run** を押す
6. 「Success. No rows returned」等の成功表示を確認する

## 適用後の確認SQL

### テーブルとRLSが存在するか

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

`rowsecurity` が全テーブルで `true` になっていることを確認してください。

### ポリシー一覧

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, cmd;
```

`matches` / `schedules` / `video_analyses` など各テーブルに select/insert/update/delete の4ポリシーが揃っているか確認してください(`notification_log` はクライアント向けポリシーが**ない**のが正しい状態です)。

### トリガー一覧

```sql
select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table;
```

以下が存在することを確認してください。

- `on_auth_user_created`(`auth.users` への insert 後)
- `video_analyses_enforce_status_transition`
- `analysis_quality_metrics_enforce_ownership` / `analysis_events_enforce_ownership` / `coaching_results_enforce_ownership` / `analysis_feedback_enforce_ownership`
- `profiles_protect_plan_columns`
- `video_analyses_enforce_quota`

### 関数のsearch_pathが設定されているか(今回追加分)

```sql
select proname, prosecdef, proconfig
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'enforce_video_analysis_status_transition',
    'enforce_video_analysis_ownership',
    'protect_profile_plan_columns',
    'enforce_video_analysis_quota',
    'handle_new_user'
  );
```

`proconfig` に `search_path=public,pg_temp`(`handle_new_user` は `search_path=public`)が含まれていることを確認してください。

### Storageバケット

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('profile-icons', 'match-videos');
```

- `profile-icons`: `public = true`, `file_size_limit = 5242880`
- `match-videos`: `public = false`, `file_size_limit = 314572800`

### plan_limits の初期データ

```sql
select * from public.plan_limits order by plan_type;
```

`free` / `pro` / `admin` の3行が存在し、`free` の上限が意図通りか確認してください(将来変更する場合は `update public.plan_limits set monthly_analysis_limit = ... where plan_type = 'free';` で調整できます)。

### 文字数制限CHECK制約が入っているか(migration 5: 2巡目監査で追加)

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition, convalidated
from pg_constraint
where conname like '%_length_check'
order by conrelid::regclass::text, conname;
```

`matches`(11列)・`schedules`(3列)・`profiles`(4列)・`video_analyses`(1列)分の行が返り、`convalidated` が `false`(=`not valid` で追加された想定通りの状態)になっていることを確認してください。

## CRON_SECRET が設定されているか(2巡目監査で必須化)

これはSQLではなく **Vercel(またはホスティング先)の環境変数設定** で確認します。`CRON_SECRET` が未設定の場合、`/api/cron/notifications` は2巡目監査以降は常に401を返すようになったため(fail-closed)、**Vercel Cronからの定期実行が全く動かなくなります**(以前のように「誰でも呼べる」状態にはなりませんが、通知そのものが送られません)。本番デプロイ前に、Vercelプロジェクトの Settings > Environment Variables で `CRON_SECRET` が設定されていることを必ず確認してください。

## ロールバック上の注意

- `supabase/schema.sql` と各migrationは**追加のみ**(`create table if not exists` / `add column if not exists` / `drop policy if exists` → `create policy`)で設計されており、既存データを削除する文はありません。そのため「ロールバック」は基本的に不要ですが、もし戻す必要がある場合は以下を個別に検討してください。
  - 新しいカラム(例: `plan_type`)を削除する場合は `alter table ... drop column ...` を使いますが、**アプリのコードがそのカラムを前提にしているため、コードを先にロールバックしてから行ってください。**
  - トリガー・関数を削除する場合は `drop trigger ... on ...` / `drop function ...` を使いますが、削除するとRLSだけでは防げていた不正操作(状態遷移の逸脱、クォータの直接書き換え等)が可能になる点に注意してください。
- 本番データに対する `delete` / `truncate` は、このドキュメントのいかなる手順にも含まれていません。もしそのような操作が必要になった場合は、必ず事前にバックアップを取り、影響範囲を明記した上で別途判断してください。
- migration 5(文字数制限)を戻す場合は、対象の制約だけを個別に削除できます。例: `alter table public.matches drop constraint if exists matches_good_points_length_check;`。既存データは一切変更されないため、削除しても失われるデータはありません。

## 本番適用状況の記録

本番適用を実施したら、実施日・実施者・適用したファイル名をこのファイルの下に追記していくことを推奨します(例のフォーマット)。

```
- 2026-07-XX: schema.sql をプロジェクト XXXX に適用(担当: XXXX)
- 2026-07-XX: 20260717_secure_function_search_path.sql を適用(担当: XXXX)
```

現時点でこの記録欄は空です。**本セッションでは本番適用を行っていません。**
