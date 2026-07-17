import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー | REFLOG",
  description: "REFLOGのプライバシーポリシー",
};

const EFFECTIVE_DATE = "2026年7月17日";
const CONTACT_EMAIL = "niizuma6090@gmail.com";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-orange-500">
        {title}
      </h2>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            Legal
          </p>
          <h1 className="text-lg font-bold tracking-tight">
            プライバシーポリシー
          </h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-xl flex-1 space-y-6 px-4 py-6">
        <p className="text-xs text-zinc-500">最終改定日: {EFFECTIVE_DATE}</p>

        <p className="text-sm leading-relaxed text-zinc-400">
          REFLOG(以下「本サービス」)は、ユーザーの皆様の個人情報を適切に取り扱うことが重要な責務であると認識し、以下のとおりプライバシーポリシー(以下「本ポリシー」)を定めます。
        </p>

        <Section title="取得する情報">
          <p>本サービスは、ユーザーの利用にあたり以下の情報を取得します。</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <span className="text-white">アカウント情報</span>:
              メールアドレス、パスワード(ハッシュ化して保存)、Googleログインを利用する場合はGoogleアカウントの基本情報(メールアドレス・表示名等)
            </li>
            <li>
              <span className="text-white">プロフィール情報</span>:
              ユーザー名、表示名、都道府県、審判級、活動カテゴリー、審判歴、プロフィールアイコン(画像アップロードを含む)
            </li>
            <li>
              <span className="text-white">試合記録データ</span>:
              日時、大会名、担当ポジション、自己評価、振り返りメモ、キーワード等ユーザーが入力する記録内容
            </li>
            <li>
              <span className="text-white">スケジュール情報</span>:
              ユーザーが登録する試合・大会等の予定
            </li>
            <li>
              <span className="text-white">動画データ</span>:
              動画分析機能を利用する場合にアップロードされる試合映像、および映像から自動的に計算される品質指標(明るさ・解像度等)
            </li>
            <li>
              <span className="text-white">通知関連情報</span>:
              プッシュ通知の購読情報(エンドポイント・暗号鍵)、通知設定、通知の送信・既読履歴
            </li>
            <li>
              <span className="text-white">利用状況・端末情報</span>:
              アクセスログ、IPアドレス、ブラウザ・端末の種類など、本サービスの安定運用のために自動的に取得される情報
            </li>
          </ul>
        </Section>

        <Section title="利用目的">
          <p>取得した情報は、以下の目的の範囲内で利用します。</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>本サービスの提供・維持・本人確認・認証のため</li>
            <li>試合記録、年間レポート、成長グラフ、AIによる振り返り・アドバイス・育成プランなど、記録データを活用した機能を提供するため</li>
            <li>動画分析機能において、映像の品質判定・解析結果・コーチング内容を表示するため</li>
            <li>プッシュ通知・アプリ内通知を配信するため</li>
            <li>不正利用の防止、利用規約違反への対応、セキュリティの確保のため</li>
            <li>本サービスの不具合対応・改善・新機能の検討のため</li>
            <li>ユーザーからのお問い合わせへの対応のため</li>
          </ul>
        </Section>

        <Section title="Supabase(外部委託先)の利用">
          <p>
            本サービスは、データベース・認証・ファイルストレージの基盤として
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 font-semibold text-orange-400"
            >
              Supabase
            </a>
            を利用しています。上記「取得する情報」に記載したデータの大部分は、Supabaseが提供するクラウドインフラストラクチャ上に保存されます。
          </p>
          <p>
            各テーブル・ストレージには行レベルセキュリティ(RLS)が設定されており、ユーザー本人以外が他のユーザーのデータに直接アクセスすることはできません。Supabaseにおけるデータの取り扱いについては、Supabase社自身のプライバシーポリシーもあわせてご確認ください。
          </p>
        </Section>

        <Section title="Push通知">
          <p>
            本サービスは、ブラウザのPush APIを利用してプッシュ通知を送信する場合があります。通知を許可すると、通知の配信に必要な購読情報(エンドポイントURLおよび暗号化用の鍵)がSupabase上に保存されます。
          </p>
          <p>
            通知の許可は、端末のブラウザ設定または本サービスの設定画面からいつでも取り消すことができます。通知を許可しない場合でも、本サービスの主要な機能は引き続きご利用いただけます。
          </p>
        </Section>

        <Section title="Cookie等の利用">
          <p>
            本サービスは、ログイン状態の維持(セッション管理)のためにCookieを使用します。これは本サービスの認証基盤(Supabase Auth)が発行する認証用Cookieであり、ユーザーの行動を第三者の広告配信等の目的で追跡するものではありません。
          </p>
          <p>
            ブラウザの設定によりCookieを無効化することも可能ですが、その場合ログイン状態を維持できず、本サービスの一部機能がご利用いただけなくなります。
          </p>
        </Section>

        <Section title="第三者提供">
          <p>
            運営者は、次の場合を除き、あらかじめユーザーの同意を得ることなく個人情報を第三者に提供しません。
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護のために必要な場合であって、本人の同意を得ることが困難な場合</li>
            <li>上記「Supabase」など、本サービスの提供に必要な範囲でクラウドインフラ・通知配信等の業務委託先に取り扱いを委託する場合</li>
          </ul>
        </Section>

        <Section title="データの保管・削除">
          <p>
            ユーザーの情報は、アカウントが存続する限り保管されます。ユーザーは設定画面からアカウントを削除でき、削除が完了すると、当該アカウントに紐づく試合記録・スケジュール・動画・通知設定等のデータはSupabase上から削除され、復元することはできません。
          </p>
        </Section>

        <Section title="安全管理措置">
          <p>
            運営者は、取得した個人情報の漏えい、滅失またはき損の防止その他の安全管理のため、行レベルセキュリティ(RLS)によるアクセス制御、通信の暗号化(HTTPS)、サービス提供に必要な範囲でのアクセス権限の限定など、必要かつ適切な措置を講じます。
          </p>
        </Section>

        <Section title="開示・訂正・削除等の請求">
          <p>
            ユーザーは、自己の個人情報について、開示・訂正・利用停止・削除等を求めることができます。プロフィール情報・試合記録データは設定画面から直接編集・削除でき、全データのエクスポート(CSV形式)にも対応しています。その他の請求については、下記のお問い合わせ先までご連絡ください。
          </p>
        </Section>

        <Section title="お問い合わせ">
          <p>
            本ポリシーに関するお問い合わせ、および個人情報の開示等の請求は、下記メールアドレスまでご連絡ください。
          </p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-orange-400"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <Section title="改訂">
          <p>
            運営者は、法令の変更や本サービスの内容変更等に応じて、本ポリシーを予告なく改定することがあります。重要な変更を行う場合は、本サービス上での掲示その他の方法により周知するよう努めます。改定後のポリシーは、本サービス上に表示した時点から効力を生じるものとします。
          </p>
        </Section>

        <p className="pb-6 text-center text-xs text-zinc-600">
          <Link href="/terms" className="text-orange-500">
            利用規約
          </Link>
          {" "}もあわせてご確認ください。
        </p>
      </main>
    </div>
  );
}
