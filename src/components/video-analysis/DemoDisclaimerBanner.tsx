export function DemoDisclaimerBanner() {
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
    >
      <p className="font-bold">⚠️ デモ解析パイプライン</p>
      <p className="mt-1 text-amber-200/90">
        コート・選手・ボールの検出および審判へのコーチング内容は、まだ実際のAIモデルによる解析ではないデモ表示です。実際に計測しているのは動画の長さ・解像度・明るさなどの映像品質のみです。
        AIは公式な判定を行いません。
      </p>
    </div>
  );
}
