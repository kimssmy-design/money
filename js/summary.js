// summary.js
// 역할: "기간"과 "지출 목록"을 받아서 합계를 계산만 함. 화면이나 데이터베이스는 전혀 모름.

function toDateStr(d) {
  // Date 객체 → "YYYY-MM-DD" 문자열
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * preset: "thisMonth" | "lastMonth"
 * 반환: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 */
export function getPresetRange(preset) {
  const now = new Date();

  if (preset === "lastMonth") {
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthEnd = new Date(firstOfThisMonth.getTime() - 1); // 지난달 마지막날
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    return { start: toDateStr(lastMonthStart), end: toDateStr(lastMonthEnd) };
  }

  // 기본값: 이번 달 1일 ~ 오늘
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toDateStr(thisMonthStart), end: toDateStr(now) };
}

/**
 * entries 중 start~end(포함) 범위에 해당하는 것만 필터링.
 * start, end는 "YYYY-MM-DD" 문자열 (문자열 비교로 충분히 정확함).
 */
export function filterByRange(entries, start, end) {
  return entries.filter((e) => e.date >= start && e.date <= end);
}

/**
 * 필터링된 entries로 합계 계산.
 * 반환: { total, cash, card, byWriter: { seonyeong, hyunwoo, gongyong } }
 */
export function computeTotals(entries) {
  const result = {
    total: 0,
    cash: 0,
    card: 0,
    byWriter: { seonyeong: 0, hyunwoo: 0, gongyong: 0 }
  };

  for (const e of entries) {
    const amount = Number(e.amount) || 0;
    result.total += amount;

    if (e.method === "cash") result.cash += amount;
    if (e.method === "card") result.card += amount;

    if (result.byWriter[e.writer] !== undefined) {
      result.byWriter[e.writer] += amount;
    }
  }

  return result;
}
