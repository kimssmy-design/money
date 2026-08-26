// noSpendStreak.js
// 역할: "소비 없는 날"이 며칠 연속 이어지고 있는지 계산.
// 대출이자·보험료 같은 고정비(🧾고정비, 💰금융)는 안 쓸 수 없는 돈이라 예외로 두고,
// 그 카테고리만 있는 날은 여전히 "무지출 날"로 침.
// 개인별이 아니라 가계부 전체(부부 공동) 기준 하나만 계산함.

import { dateStrToDayNumber, todayDayNumber } from "./dateUtil.js";

export const EXEMPT_CATEGORIES = ["🧾고정비", "💰금융"];

const BADGE_LEVELS = [
  { days: 14, emoji: "🍀" },
  { days: 7, emoji: "🌿" },
  { days: 3, emoji: "🌱" }
];

/**
 * entries(전체 지출 기록)를 받아 "현재 이어지고 있는 무지출 연속일수"를 반환.
 * 오늘은 아직 하루가 안 끝났으니 계산에서 빼고, 어제부터 거꾸로 셈.
 * 기록을 시작하기 전(가장 오래된 기록보다 이전) 날짜는 "데이터가 없을 뿐"이지
 * 실제로 안 썼다는 보장이 없으므로 스트릭에 포함하지 않음.
 */
export function computeNoSpendStreak(entries) {
  if (entries.length === 0) return 0;

  const spendingDayNums = new Set(
    entries.filter((e) => !EXEMPT_CATEGORIES.includes(e.category)).map((e) => dateStrToDayNumber(e.date))
  );

  const earliestDayNum = Math.min(...entries.map((e) => dateStrToDayNumber(e.date)));
  const today = todayDayNumber();

  let streak = 0;
  let cursor = today - 1; // 어제부터

  while (cursor >= earliestDayNum) {
    if (spendingDayNums.has(cursor)) break; // 지출(예외 카테고리 제외)이 있는 날 → 스트릭 종료
    streak++;
    cursor--;
  }

  return streak;
}

export function getNoSpendBadge(streak) {
  for (const level of BADGE_LEVELS) {
    if (streak >= level.days) return level.emoji;
  }
  return "";
}
