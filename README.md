# REFLOG

バスケットボール審判のための試合記録アプリ。Next.js (App Router) + Supabase 製の PWA です。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabase プロジェクトを作成する

1. [supabase.com](https://supabase.com) でアカウントを作成し、新規プロジェクトを作成します。
2. Supabase ダッシュボードの **Project Settings > API** から以下を控えます。
   - `Project URL`
   - `anon public` キー
   - `service_role` キー(サーバー専用。**絶対に公開しない**)

### 3. データベースを構築する

Supabase ダッシュボードの **SQL Editor** を開き、[`supabase/schema.sql`](supabase/schema.sql) の内容をそのまま貼り付けて実行してください。以下が作成されます。

- `profiles` テーブル(名前・都道府県・審判級・活動カテゴリー・審判歴)+ RLS ポリシー
- `matches` テーブル(試合記録)+ RLS ポリシー(自分のデータのみ読み書き可能)
- 新規ユーザー登録時に `profiles` 行を自動作成するトリガー

### 4. Google ログインを有効化する(任意)

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth クライアント ID を作成します。
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクト URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Supabase ダッシュボードの **Authentication > Providers > Google** を開き、有効化して Client ID / Client Secret を設定します。
3. **Authentication > URL Configuration** で以下を設定します。
   - Site URL: `http://localhost:3000`(本番では実際のドメイン)
   - Redirect URLs に `http://localhost:3000/auth/callback` と本番ドメインの `/auth/callback` を追加

メールログインのみで使う場合、この手順はスキップして構いません(ホーム画面には「Googleでログイン」ボタンが表示されますが、Providerを有効化するまではエラーになります)。

### 5. 環境変数を設定する

`.env.local.example` をコピーして `.env.local` を作成し、値を入力します。

```bash
cp .env.local.example .env.local
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. 開発サーバーを起動する

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと `/login` にリダイレクトされます(ログイン必須)。

## 主な機能

- **認証**: Google ログイン / メールログイン(新規登録・パスワードリセット含む) — [`src/app/login`](src/app/login)、[`src/app/reset-password`](src/app/reset-password)、[`src/app/update-password`](src/app/update-password)
- **試合記録**: 記録・一覧・詳細・削除。すべて Supabase の `matches` テーブルに保存され、複数端末で自動的に同期されます — [`src/lib/matches.ts`](src/lib/matches.ts)
- **ローカルデータの移行**: Version 0.1/0.2 で `localStorage` に保存されていた記録は、初回ログイン時に自動で Supabase へ移行されます — [`src/lib/migration.ts`](src/lib/migration.ts)
- **ダッシュボード**: 今月/今年の試合数、担当ポジション別回数、自己評価平均、最近の記録、課題キーワード — [`src/app/dashboard`](src/app/dashboard)
- **AI振り返り(ルールベース)**: 記録内容からキーワードを検出して簡易フィードバックを表示。将来 OpenAI 等の実 API に差し替えやすいよう関数を分離しています — [`src/lib/aiReflection.ts`](src/lib/aiReflection.ts)
- **CSV出力**: UTF-8 BOM付きでExcelでも文字化けせずに開けます — [`src/lib/csv.ts`](src/lib/csv.ts)
- **プロフィール/設定**: 名前・都道府県・審判級・活動カテゴリー・審判歴の編集、データエクスポート、アカウント削除 — [`src/app/settings`](src/app/settings)
- **PWA**: ホーム画面に追加してアプリのように起動可能。manifest / service worker / アイコンを実装済み — [`src/app/manifest.ts`](src/app/manifest.ts)、[`public/sw.js`](public/sw.js)

## 認証まわりのアーキテクチャ

- `src/proxy.ts` — Next.js 16 の Proxy(旧 Middleware)。未ログインで保護ページにアクセスすると `/login` にリダイレクトします。
- `src/lib/supabase/client.ts` — ブラウザ用 Supabase クライアント。
- `src/lib/supabase/server.ts` — Server Component / Route Handler 用(Cookie ベースのセッション)。
- `src/lib/supabase/admin.ts` — `service_role` キーを使うサーバー専用クライアント。アカウント削除 API (`src/app/api/account/delete/route.ts`) からのみ使用します。
- `src/components/AuthProvider.tsx` — セッション状態を保持し、ログイン検知時にローカルデータ移行を1回だけ実行します。

## アカウント削除の仕組み

`profiles` と `matches` テーブルは `auth.users` への外部キーに `on delete cascade` を設定しているため、`supabase.auth.admin.deleteUser()` を呼ぶだけで関連データもまとめて削除されます。この呼び出しは `service_role` キーが必要なため、クライアントから直接実行せず `src/app/api/account/delete/route.ts` (サーバー専用の Route Handler) 経由で行います。

## スクリプト

```bash
npm run dev      # 開発サーバー
npm run build    # 本番ビルド
npm run lint     # ESLint
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
