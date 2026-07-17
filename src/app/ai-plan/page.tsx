"use client";

import { useEffect, useState } from "react";
import { getMatches, type MatchRecord } from "@/lib/matches";


function getTheme(score: number) {
  if (score < 2.5) {
    return "プライマリーの意識向上";
  }

  if (score < 3.5) {
    return "判定後の切り替えと説得力アップ";
  }

  return "ゲームコントロール力の向上";
}

function getMessage(score: number, count: number) {
  if (count === 0) {
    return "まずは1試合記録して、自分の現在地を見える化しましょう。";
  }

  if (score < 2.5) {
    return "今月は基本に戻って、見る場所と立ち位置を丁寧に確認しましょう。";
  }

  if (score < 3.5) {
    return "良い成長段階です。次は判定後の所作や切り替えを意識しましょう。";
  }

  return "高いレベルで安定しています。次は周囲を導く審判を目指しましょう。";
}

export default function AIPlanPage() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  useEffect(() => {
    async function loadMatches() {
      const data = await getMatches();
      setMatches(data);
    }

    loadMatches();
  }, []);
  const matchCount = matches.length;
  const averageScore =
  matchCount === 0
    ? 0
    : matches.reduce((sum, match) => {
        const score =
          (match.judgmentRating +
            match.positionRating +
            match.communicationRating) / 3;

        return sum + score;
      }, 0) / matchCount;

  const theme = getTheme(averageScore);
  const message = getMessage(averageScore, matchCount);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <h1 className="mb-8 text-3xl font-bold">🏀 AI育成プラン</h1>

      <div className="mb-6 rounded-2xl bg-zinc-900 p-6">
        <h2 className="mb-3 text-xl font-bold">現在の分析</h2>
        <p>今年の試合数：{matchCount}試合</p>
        <p>自己評価平均：{averageScore.toFixed(1)}</p>
      </div>

      <div className="mb-6 rounded-2xl bg-zinc-900 p-6">
        <h2 className="mb-3 text-xl font-bold">今月のテーマ</h2>
        <p className="text-orange-400 font-bold">{theme}</p>
      </div>

      <div className="mb-6 rounded-2xl bg-zinc-900 p-6">
        <h2 className="mb-3 text-xl font-bold">今月の課題</h2>
        <ul className="space-y-2">
          <li>✅ プライマリーを試合前に確認する</li>
          <li>✅ 判定後のジェスチャーを大きくする</li>
          <li>✅ 試合後に良かった判定を1つ記録する</li>
        </ul>
      </div>

      <div className="rounded-2xl bg-zinc-900 p-6">
        <h2 className="mb-3 text-xl font-bold">AIからの一言</h2>
        <p>{message}</p>
      </div>
    </main>
  );
}