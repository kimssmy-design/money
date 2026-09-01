// stats.js
// 역할: 통계 화면에 필요한 계산만 담당. 화면(DOM)이나 Firestore는 전혀 모름.

import { dateStrToDayNumber, dayNumberToDateStr } from "./dateUtil.js";
import { CATEGORIES } from "./categories.js";

/**
 * entries로 카테고리별 금액/건수/비중을 계산해 금액 내림차순으로 반환.
 * 반환: [{ category, amount, count, percent }, ...]
 */
export function computeCategoryBreakdown(entries) {
  const totals = {};
  for (const cat of CATEGORIES) totals[cat] = { amount: 0, count: 0 };

  let grandTotal = 0;
  for (const e of entries) {
    const amount = Number(e.amount) || 0;
    grandTotal += amount;
    if (totals[e.category]) {
      totals[e.category].amount += amount;
      totals[e.category].count += 1;
    }
  }

  return CATEGORIES.map((cat) => ({
    category: cat,
    amount: totals[cat].amount,
    count: totals[cat].count,
    percent: grandTotal > 0 ? (totals[cat].amount / grandTotal) * 100 : 0
  })).sort((a, b) => b.amount - a.amount);
}

/**
 * 선택된 기간(range)과 "같은 길이"의 바로 직전 기간을 계산.
 * 예: 8/1~8/20(20일) 선택 → 직전 20일인 7/12~7/31을 돌려줌.
 * 이번 달/지난 달/직접선택 어떤 걸 고르든 항상 "같은 기준"으로 비교할 수 있게 하기 위함.
 */
export function computePreviousPeriod(range) {
  const startNum = dateStrToDayNumber(range.start);
  const endNum = dateStrToDayNumber(range.end);
  const lengthDays = endNum - startNum + 1;

  const prevEndNum = startNum - 1;
  const prevStartNum = prevEndNum - lengthDays + 1;

  return { start: dayNumberToDateStr(prevStartNum), end: dayNumberToDateStr(prevEndNum) };
}

/**
 * 전체 기록(allEntries)으로 "완료된 달"들의 월평균 지출을 계산.
 * 진행 중인 이번 달은 아직 다 안 썼을 수 있으므로 평균 계산에서 제외.
 * 반환: { average, monthCount } 또는 완료된 달이 하나도 없으면 null.
 */
export function computeMonthlyAverage(allEntries) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalsByMonth = {};
  for (const e of allEntries) {
    const monthKey = e.date.slice(0, 7); // "YYYY-MM"
    if (monthKey === currentMonthKey) continue;
    totalsByMonth[monthKey] = (totalsByMonth[monthKey] || 0) + (Number(e.amount) || 0);
  }

  const monthTotals = Object.values(totalsByMonth);
  if (monthTotals.length === 0) return null;

  const average = monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length;
  return { average, monthCount: monthTotals.length };
}
