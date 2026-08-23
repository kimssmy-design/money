// streak.js
// 역할: 선영/현우 각자의 "연속 기록일수"를 계산. 공용 기록은 포함하지 않음.
// 규칙: 하루 정도 건너뛰어도 스트릭이 끊기지 않음(하루 공백 허용).
//       단, 이틀 이상 연속으로 기록이 없으면 끊김.

export const STREAK_WRITERS = ["seonyeong", "hyunwoo"];
export const BADGE_SILVER_DAYS = 7;
export const BADGE_GOLD_DAYS = 30;

function toDayNumber(dateStr) {
  // "YYYY-MM-DD" → 1970-01-01부터 며칠째인지(정수). 문자열 파싱이라 시간대 영향 없음.
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function todayDayNumber() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
}

function computeStreakForDates(dateStrings) {
  if (dateStrings.length === 0) return 0;

  const dayNums = [...new Set(dateStrings.map(toDayNumber))].sort((a, b) => b - a); // 최신순
  const today = todayDayNumber();

  // 가장 최근 기록이 오늘 기준 이틀(=하루 공백까지만 허용) 넘게 지났으면 스트릭은 이미 끊긴 것
  if (today - dayNums[0] > 2) return 0;

  let streak = 1;
  for (let i = 0; i < dayNums.length - 1; i++) {
    const gap = dayNums[i] - dayNums[i + 1];
    if (gap <= 2) {
      streak++; // 하루 공백까지는 계속 이어짐
    } else {
      break;
    }
  }
  return streak;
}

/**
 * entries(전체 지출 기록, 기간 필터링 안 된 것)를 받아
 * { seonyeong: 연속일수, hyunwoo: 연속일수 } 반환.
 * "실제 기록자(loggedBy)"가 있으면 그 값을, 없으면(예전 기록) writer를 사용.
 * writer가 공용이고 loggedBy도 없는 예전 기록은 어느 쪽 스트릭에도 들어가지 않음.
 */
export function computeStreaks(entries) {
  const result = {};
  for (const writer of STREAK_WRITERS) {
    const dates = entries
      .filter((e) => (e.loggedBy ?? (e.writer !== "gongyong" ? e.writer : null)) === writer)
      .map((e) => e.date);
    result[writer] = computeStreakForDates(dates);
  }
  return result;
}

/**
 * 스트릭 일수에 따른 뱃지 이모지 (30일 이상 골드, 7일 이상 실버, 그 미만은 없음)
 */
export function getBadge(streak) {
  if (streak >= BADGE_GOLD_DAYS) return "🏆";
  if (streak >= BADGE_SILVER_DAYS) return "🎖️";
  return "";
}
