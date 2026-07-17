export default function HomeHeader() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300">
        Basketball Referee
      </span>

      <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
        REF<span className="text-cyan-300">LOG</span>
      </h1>

      <div className="h-px w-20 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />

      <p className="max-w-xs text-sm leading-6 text-zinc-400">
        試合の記録を、もっとスマートに。
      </p>
    </div>
  );
}