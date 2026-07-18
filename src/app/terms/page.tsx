import Link from "next/link";

export const metadata = {
  title: "利用規約 | REFLOG",
  description: "REFLOGの利用規約",
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

export default function TermsPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/settings"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
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
          <h1 className="text-lg font-bold tracking-tight">利用規約</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-xl flex-1 space-y-6 px-4 py-6">
        <p className="text-xs text-zinc-400">
          最終改定日: {EFFECTIVE_DATE}
        </p>

        <p className="text-sm leading-relaxed text-zinc-400">
          この利用規約(以下「本規約」)は、REFLOG(以下「本サービス」)の利用条件を定めるものです。ユーザーの皆様には、本規約に同意いただいた上で本サービスをご利用いただきます。
        </p>

        <Section title="第1条 適用">
          <p>
            本規約は、本サービスの利用に関する運営者とユーザーとの間の一切の関係に適用されます。本サービスを利用した時点で、ユーザーは本規約に同意したものとみなされます。
          </p>
        </Section>

        <Section title="第2条 アカウント登録">
          <p>
            本サービスの利用には、メールアドレスまたはGoogleアカウントによるユーザー登録が必要です。ユーザーは、登録情報を正確かつ最新の状態に保つものとし、アカウントの管理について自己の責任を負うものとします。
          </p>
          <p>
            登録情報に虚偽があった場合、または第三者に不正利用された場合であっても、運営者はその結果生じた損害について責任を負いません。
          </p>
        </Section>

        <Section title="第3条 禁止事項">
          <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為、またはそのおそれのある行為</li>
            <li>運営者、他のユーザー、または第三者の知的財産権・肖像権・プライバシーその他の権利を侵害する行為</li>
            <li>他のユーザーになりすます行為、または虚偽の情報を登録する行為</li>
            <li>本サービスのサーバーやネットワークに過度な負荷をかける行為、不正アクセスを試みる行為</li>
            <li>本サービスのソースコード・データを許可なく複製、改変、リバースエンジニアリングする行為</li>
            <li>本サービスを通じて得た他のユーザーの情報を、本来の目的を超えて利用・第三者提供する行為</li>
            <li>反社会的勢力への利益供与その他の協力行為</li>
            <li>その他、運営者が不適切と合理的に判断する行為</li>
          </ul>
        </Section>

        <Section title="第4条 本サービスの提供・変更">
          <p>
            運営者は、ユーザーへの事前の通知なく、本サービスの内容を変更、追加、または提供を中止することができるものとします。本サービスは開発途上の機能(AIによる分析・提案・動画解析のデモ機能等)を含む場合があり、これらは参考情報であって内容の正確性・完全性を保証するものではありません。
          </p>
        </Section>

        <Section title="第5条 サービスの停止・中断">
          <p>
            運営者は、以下のいずれかに該当する場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>本サービスにかかるシステムの保守点検または更新を行う場合</li>
            <li>地震、落雷、火災、停電、天災などの不可抗力により本サービスの提供が困難となった場合</li>
            <li>コンピュータまたは通信回線等が事故により停止した場合</li>
            <li>外部サービス(Supabase等のクラウド基盤、プッシュ通知配信サービス等)に障害が発生した場合</li>
            <li>その他、運営者が本サービスの停止・中断が必要と合理的に判断した場合</li>
          </ul>
          <p>
            運営者は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負いません。運営者は、事前の予告なく本サービスの提供を終了することができるものとします。
          </p>
        </Section>

        <Section title="第6条 著作権・知的財産権">
          <p>
            本サービスに関する著作権・商標権その他一切の知的財産権は、運営者または正当な権利を有する第三者に帰属します。本規約に基づく本サービスの利用許諾は、本サービスに関する運営者または第三者の知的財産権の使用許諾を意味するものではありません。
          </p>
          <p>
            ユーザーが本サービス上に記録・投稿したデータ(試合記録、動画、コメント等)の著作権はユーザー本人に留保されます。ただし運営者は、本サービスの提供・維持・改善(不具合対応、バックアップ、集計処理等)に必要な範囲でこれらのデータを利用できるものとします。
          </p>
        </Section>

        <Section title="第7条 免責事項">
          <p>
            本サービスは、現状有姿(as is)で提供されるものであり、運営者は本サービスに事実上または法律上の瑕疵(安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティ等に関する欠陥、エラーやバグ、権利侵害等を含みます)がないことを明示的にも黙示的にも保証しません。
          </p>
          <p>
            本サービス内で提供されるAIによる振り返り・アドバイス・成長プラン・動画解析結果等は、参考情報の提供を目的とするものであり、その正確性・完全性・有用性を保証するものではありません。とりわけ動画解析機能の一部はデモ段階の実装であり、実際の映像解析AIによる判定ではないコンテンツを含みます。これらの情報を用いた判断の結果について、運営者は責任を負いません。
          </p>
          <p>
            運営者は、本サービスに起因してユーザーに生じたあらゆる損害について、運営者の故意または重過失による場合を除き、一切の責任を負いません。運営者が損害賠償責任を負う場合であっても、その賠償額は、当該損害が発生した月にユーザーが本サービスに関して運営者に支払った利用料の額を上限とします(本サービスが無償で提供されている機能については、運営者は賠償責任を負いません)。
          </p>
          <p>
            本サービスからリンクされる外部サイト・外部サービス上で行われるユーザーと第三者との取引・トラブルについて、運営者は一切の責任を負いません。
          </p>
        </Section>

        <Section title="第8条 利用制限・登録抹消">
          <p>
            運営者は、ユーザーが本規約のいずれかの条項に違反した場合、事前の通知なく、当該ユーザーに対して本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
          </p>
        </Section>

        <Section title="第9条 退会・アカウント削除">
          <p>
            ユーザーは、設定画面からいつでも本サービスを退会し、アカウントを削除することができます。アカウント削除を行うと、当該アカウントに紐づく試合記録・年間目標・動画・通知設定等のデータは削除され、復元することはできません。
          </p>
        </Section>

        <Section title="第10条 本規約の変更">
          <p>
            運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の本規約は、本サービス上に表示した時点より効力を生じるものとします。
          </p>
        </Section>

        <Section title="第11条 準拠法・管轄裁判所">
          <p>
            本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を専属的合意管轄とします。
          </p>
        </Section>

        <Section title="お問い合わせ">
          <p>
            本規約に関するお問い合わせは、下記メールアドレスまでご連絡ください。
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

        <p className="pb-6 text-center text-xs text-zinc-400">
          <Link href="/privacy" className="text-orange-500">
            プライバシーポリシー
          </Link>
          {" "}もあわせてご確認ください。
        </p>
      </main>
    </div>
  );
}
