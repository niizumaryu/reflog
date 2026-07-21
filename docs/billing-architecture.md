# 課金アーキテクチャ監査(round 7、2026-07-21実施)

Stripe / PayPay 等の決済プロバイダは**本ラウンドでも接続していません**。このドキュメン
トは、実装する前に確認しておくべき土台(`plan_type` / `plan_limits` の設計)が安全かを
現在のコード・スキーマを直接読んで検証した記録と、実装時に必要な設計判断の一覧です。

## 現状の確認結果

### `plan_type` をクライアントから改ざんできないか → **できない(確認済み)**

`supabase/schema.sql` の `protect_profile_plan_columns()` トリガー(`profiles` テーブル
の `before update`)が、`plan_type` / `monthly_video_analysis_count` /
`monthly_video_analysis_period_start` の3列について、**`service_role` または `postgres`
以外からの変更を例外で拒否**します(`current_setting('reflog.bypass_plan_guard')` が
`'on'` の場合のみ例外)。認証済みユーザーが自分の `anon` キー(RLS越しの通常のクライア
ント権限)で `profiles` テーブルを直接UPDATEしても、`plan_type` を書き換えることはでき
ません。将来Stripe Webhookでプランを変更する処理は、`service_role` キー(サーバー側の
み)で実行する設計を維持してください。

### `plan_limits` の単一情報源 → **確認済み**

`plan_limits` テーブル(`plan_type` を主キーとする1行1プラン)が唯一の情報源です。RLS
は **SELECTのみ**許可されており(`"Authenticated users can view plan limits"`)、
INSERT/UPDATE/DELETEのポリシーは存在しません。つまり `service_role` 以外はこのテーブル
を一切変更できません。クライアント側の表示ロジック(`src/lib/video-analysis/
planUsage.ts` の `computeUsageSummary`)とDB側の強制ロジック(`enforce_video_analysis_
quota` トリガー)は、どちらもこの同じテーブルを参照するため、表示と実際の制限がズレる
構造的な原因はありません。

### `admin` の永久無料・無制限 → **確認済み**

`plan_limits` の初期データ: `admin` は `monthly_analysis_limit = null`(無制限)・
`retention_days = null`(原動画を無期限保持、`src/lib/video-analysis/retention.ts` の
`isEligibleForOriginalVideoPurge` が `retentionDays === null` を「対象外」として扱う)。

### `free` / `pro` / `admin` 以外を拒否 → **確認済み**

`profiles_plan_type_check` CHECK制約(`plan_type in ('free', 'pro', 'admin')`)がDB側に
存在します。

### 月次上限のリセット基準・timezone → **UTC暦月**

`monthly_video_analysis_period_start` を基準に、`enforce_video_analysis_quota` トリガー
とクライアント側の `computeUsageSummary` の両方が **UTCの暦月**でリセット判定します(JST
ではありません)。表示とDB強制の基準は一致しているため機能上の不整合はありませんが、
JST基準を期待するユーザーの体感とは数時間〜半日ずれる可能性があります(4巡目監査で発見
済み、P3として意図的に見送り継続中 — [`docs/known-limitations.md`](./known-limitations.md)
参照)。課金と連動させる際、請求サイクルをJST基準にするなら、ここも合わせて設計し直す
必要があります。

## 決済プロバイダ接続時に決める必要がある設計(未着手・運営者判断)

以下はStripe/PayPay等を実装する**前に**決めておくべき項目です。現時点のコードには存在
しません。

| 項目 | 現状 | 実装時に決めること |
| --- | --- | --- |
| 決済失敗時の状態 | 未実装 | `pending_payment` 等の中間状態を`profiles`に持つか、決済成功まで`plan_type`を`free`のまま維持するか |
| 解約後の扱い | 未実装 | 即時`free`降格か、支払い済み期間の終わりまで`pro`を維持するか |
| proからfreeへ戻る場合の動画保持 | 未設計 | `retention_days`はプラン変更時点のプランを都度参照する設計(`videoMaintenanceDeps.ts`の`fetchPlanTypeByUserId`は実行時点の`profiles.plan_type`を見る)。**プラン降格した瞬間、`pro`時代にアップロードした動画が`free`の`retention_days=30`を基準に即座に削除対象へ転がり込む**点に注意。降格時に猶予期間を設けるか、既存動画は元のプランの保持期限を適用するかは未決定 |
| 既存データを削除するか | 未設計 | 上記と関連。降格時に試合記録等(動画以外)を削除する理由はない(容量を圧迫するのは動画のみ) |
| grace period | 未設計 | 決済失敗から何日で`free`へ降格するか未定義 |
| webhookの冪等性 | 未実装(webhook自体が存在しない) | Stripe Webhookは同一イベントを複数回送ってくることがあるため、`stripe_event_id`等をユニーク制約付きで記録し、処理済みイベントを再処理しない設計が必須 |
| 二重課金防止 | 未実装 | Checkout Session作成時に冪等キー(`idempotency key`)を使う、サーバー側で「進行中の決済セッションがあれば新規作成を拒否する」等の設計が必要 |

## 推奨する実装順序(接続する場合)

1. Stripe(または他プロバイダ)のCheckout/Webhookをサーバー専用のRoute Handlerとして追加し、`service_role`キーのみでplan_typeを更新する(既存の`protect_profile_plan_columns`トリガーがこれを強制する)。
2. Webhookの冪等性テーブル(受信済みイベントIDの記録)を先に用意する。
3. 上表の「決済失敗時の状態」「解約後の扱い」「grace period」を運営者が確定してから、状態遷移をコードに落とす。
4. プラン降格時の動画保持の扱いを決めてから、`videoMaintenanceDeps.ts`側で「降格前の猶予期間」が必要か判断する。
5. 実装後、この文書の「決済プロバイダ接続時に決める必要がある設計」セクションを実際の設計内容で更新する。

## 将来のAI動画分析・FIBAルールQA・App Store対応の依存境界(今回は設計のみ)

- **本物のAI動画分析**: `src/lib/video-analysis/types.ts` の `CourtDetector` /
  `PersonDetector` / `BallDetector` / `EventDetector` / `RefereeCoachEngine` インター
  フェースを実装したクラスに差し替えるだけで統合できる設計(`src/lib/video-analysis/
  mockAdapters.ts` が現在の唯一の実装)。前提条件: 推論を実行するインフラ(GPU推論API
  等の外部サービス、または自前ホスティング)の選定、`is_demo`フラグをfalseにする際の
  UI文言全面見直し(本ラウンドで再監査した「デモ」表現をすべて置き換える必要あり)、
  推論コストと`plan_limits.monthly_analysis_limit`の整合性の再設計。
- **FIBAルールQA**: 現状コードに関連実装なし。既存の`coach`系モジュール(`src/lib/
  coach/*`)とは独立した新機能になる想定。前提条件: ルールデータソースの選定(公式文書
  のライセンス確認)、AIコーチ機能との役割分担(「振り返りコーチ」と「ルール質問応答」
  は別物として設計する方が既存UXとの混同を避けられる)。
- **App Store / Google Play対応**: [`docs/known-limitations.md`](./known-limitations.md)
  の5節を参照。現状PWAのみ。ネイティブラップ(Capacitor等)を行う場合、Web Pushの扱い
  (iOSはPWAインストール前提の制約が既にある)・Service Workerのキャッシュ戦略・
  ストア審査用のプライバシー表示(本ドキュメントの課金設計が固まっていないと「アプリ内
  課金」の審査要件に抵触する可能性がある点に注意)。

いずれも今回は大型実装を行っていません(指示により、依存境界と前提条件の文書化のみ)。
