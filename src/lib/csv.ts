import { getOverallAverage, type MatchRecord } from "@/lib/matches";

const CSV_HEADERS = [
  "日付",
  "大会名",
  "カテゴリー",
  "会場",
  "ホームチーム",
  "アウェーチーム",
  "担当ポジション",
  "試合での役割",
  "自己評価",
  "良かったこと",
  "改善したいこと",
  "次回意識すること",
  "キーワード",
  "試合動画URL",
  // Legacy columns kept for continuity with older records.
  "試合数",
  "パートナー審判",
  "難しかった判定",
  "自由メモ",
];

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function matchToRow(match: MatchRecord): string[] {
  return [
    match.date || "",
    match.competition || "",
    match.category || "",
    match.venue || "",
    match.homeTeam || "",
    match.awayTeam || "",
    match.refereePosition || "",
    match.matchRole || "",
    getOverallAverage(match).toFixed(1),
    match.goodPoints || "",
    match.improvements || "",
    match.nextGoal || "",
    match.keywords.join(" / "),
    match.videoUrl || "",
    String(match.matchCount ?? ""),
    match.partnerReferee || "",
    match.difficultCalls || "",
    match.freeNotes || "",
  ];
}

export function buildMatchesCsv(matches: MatchRecord[]): string {
  const rows = [CSV_HEADERS, ...matches.map(matchToRow)];
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

export function downloadMatchesCsv(matches: MatchRecord[]): void {
  const csvContent = buildMatchesCsv(matches);
  const BOM = "﻿";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  link.href = url;
  link.download = `reflog_matches_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
