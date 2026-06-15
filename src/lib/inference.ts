/**
 * 외국인 지분 변동 원인 추정 (규칙 기반, AI 불필요)
 *
 * 주가·거래량·보유주식 수와의 상관으로 "가능성" 태그를 붙입니다.
 * 실제 사유(실적, 뉴스, M&A)는 별도 뉴스/AI 연동이 필요합니다.
 */

import type { OwnershipInference } from "@/lib/types";

export interface InferenceInput {
  change1d: number;
  priceChange1d: number;
  foreignSharesChange: number;
  listedSharesChange: number;
  volumeRatio: number;
}

export function inferOwnershipChange(input: InferenceInput): OwnershipInference {
  const tags: string[] = [];
  const { change1d, priceChange1d, foreignSharesChange, listedSharesChange, volumeRatio } =
    input;

  if (change1d > 0.05) {
    if (priceChange1d >= 2) tags.push("주가급등동반");
    else if (priceChange1d >= 0.3) tags.push("주가상승동반");
    else if (priceChange1d <= -2) tags.push("하락장저가매수");
    else if (priceChange1d <= -0.3) tags.push("주가하락중유입");
    else tags.push("주가보합유입");
  } else if (change1d < -0.05) {
    if (priceChange1d <= -2) tags.push("주가급락동반매도");
    else if (priceChange1d <= -0.3) tags.push("주가하락동반");
    else if (priceChange1d >= 2) tags.push("상승장차익매도");
    else tags.push("지분축소");
  }

  if (Math.abs(listedSharesChange) > 0) {
    tags.push("상장주식변동");
  } else if (foreignSharesChange > 0 && change1d > 0) {
    tags.push("외국인순매수");
  } else if (foreignSharesChange < 0 && change1d < 0) {
    tags.push("외국인순매도");
  }

  if (volumeRatio >= 2.5) tags.push("거래량급증");
  else if (volumeRatio >= 1.5) tags.push("거래활발");

  const unique = [...new Set(tags)];
  const summary =
    unique.length > 0
      ? unique.join(" · ")
      : "뚜렷한 패턴 없음 — 뉴스·공시 확인 권장";

  return { tags: unique, summary, method: "rule" };
}
