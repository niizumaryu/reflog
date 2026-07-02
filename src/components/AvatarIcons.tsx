export type DefaultAvatarKey =
  | "basketball"
  | "whistle"
  | "hoop"
  | "jersey"
  | "court"
  | "shoes"
  | "refShirt"
  | "stopwatch"
  | "fireBall"
  | "starBall";

export const DEFAULT_AVATARS: { key: DefaultAvatarKey; label: string }[] = [
  { key: "basketball", label: "バスケットボール" },
  { key: "whistle", label: "ホイッスル" },
  { key: "hoop", label: "バスケットゴール" },
  { key: "jersey", label: "ユニフォーム" },
  { key: "court", label: "コート" },
  { key: "shoes", label: "バッシュ" },
  { key: "refShirt", label: "レフェリーシャツ" },
  { key: "stopwatch", label: "ストップウォッチ" },
  { key: "fireBall", label: "炎のバスケットボール" },
  { key: "starBall", label: "星付きボール" },
];

const iconProps = {
  width: "22",
  height: "22",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.8",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BasketballGlyph() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18" />
      <path d="M5.3 5.3c3.2 3.2 3.2 10.2 0 13.4M18.7 5.3c-3.2 3.2-3.2 10.2 0 13.4" />
    </svg>
  );
}

function WhistleGlyph() {
  return (
    <svg {...iconProps}>
      <path d="M9 9h7a4 4 0 1 1-4 4" />
      <path d="M9 6.5V9a4 4 0 0 1-4 4 3 3 0 0 0 0 0" />
      <circle cx="16" cy="13" r="0.6" fill="currentColor" />
      <path d="M4.5 12.2v1.6" />
    </svg>
  );
}

function HoopGlyph() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="3" width="9" height="7" rx="1" />
      <ellipse cx="15" cy="10" rx="6" ry="1.6" />
      <path d="M10.5 10c-.7 1.8-.7 4.6 0 6.5M19.5 10c.7 1.8.7 4.6 0 6.5" />
      <path d="M13.2 10.4l3.6 6.6M16.8 10.4l-3.6 6.6" />
    </svg>
  );
}

function JerseyGlyph() {
  return (
    <svg {...iconProps}>
      <path d="M8 4 4 7l2 2.5 2-1V20h8V8.5l2 1L20 7l-4-3-1.2 1.5a3 3 0 0 1-5.6 0Z" />
    </svg>
  );
}

function CourtGlyph() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 12h18" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 8h4v8H3M21 8h-4v8h4" />
    </svg>
  );
}

function ShoesGlyph() {
  return (
    <svg {...iconProps}>
      <path d="M3 17.5c0-2 1-3 2.2-4.3C6.5 12 7 10.8 7 9.2V6l3 2 2.5-1.5L14 8l2.5-1 1 2.3c1.7.6 3.5 1.6 3.5 3.7 0 2.5-2 4.5-4.5 4.5H4c-.6 0-1-.4-1-1Z" />
      <path d="M7 13.2c1.8.6 3.6.6 5.4 0" />
    </svg>
  );
}

function RefShirtGlyph() {
  return (
    <svg {...iconProps}>
      <path d="M8 4 4 7l2 2.5 2-1V20h8V8.5l2 1L20 7l-4-3-1.2 1.5a3 3 0 0 1-5.6 0Z" />
      <path d="M7.5 11h9M7.3 14h9.4M7.3 17h9.4" />
    </svg>
  );
}

function StopwatchGlyph() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 13V9M9.5 3.5h5M12 3.5V5.5" />
      <path d="M18.5 6.5 20 5" />
    </svg>
  );
}

function FireBallGlyph() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="14" r="6.5" />
      <path d="M6.6 10.6c2.3 2.3 2.3 7.2 0 9.7M17.4 10.6c-2.3 2.3-2.3 7.2 0 9.7" />
      <path d="M12 4.2c1.6 1.6 1.9 3.1.9 4.6-1-.8-1.7-.4-1.7.6 0 .8.6 1.1 1.3.9-.4 1-1.6 1.4-2.6.7-1.2-.9-1-2.7.1-4.1.6-.8.9-1.7 2-2.7Z" />
    </svg>
  );
}

function StarBallGlyph() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="13" r="7" />
      <path d="M5.7 9.6c1.9 1.9 1.9 5.8 0 7.8M16.3 9.6c-1.9 1.9-1.9 5.8 0 7.8" />
      <path
        d="M18.5 3.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

const GLYPHS: Record<DefaultAvatarKey, () => React.JSX.Element> = {
  basketball: BasketballGlyph,
  whistle: WhistleGlyph,
  hoop: HoopGlyph,
  jersey: JerseyGlyph,
  court: CourtGlyph,
  shoes: ShoesGlyph,
  refShirt: RefShirtGlyph,
  stopwatch: StopwatchGlyph,
  fireBall: FireBallGlyph,
  starBall: StarBallGlyph,
};

export function AvatarGlyph({ iconKey }: { iconKey: string }) {
  const Glyph = GLYPHS[iconKey as DefaultAvatarKey] ?? BasketballGlyph;
  return <Glyph />;
}

export function ProfileAvatar({
  avatarType,
  avatarKey,
  avatarUrl,
  size = 56,
}: {
  avatarType: string;
  avatarKey: string;
  avatarUrl: string | null;
  size?: number;
}) {
  if (avatarType === "custom" && avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary external Storage URL
      <img
        src={avatarUrl}
        alt="プロフィールアイコン"
        width={size}
        height={size}
        className="rounded-full border border-white/10 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400"
      style={{ width: size, height: size }}
    >
      <AvatarGlyph iconKey={avatarKey} />
    </div>
  );
}
