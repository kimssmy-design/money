// dateUtil.js
// 역할: "오늘 날짜" 문자열을 로컬 시간 기준으로 일관되게 계산.
// new Date().toISOString()은 UTC 기준이라, 자정 근처(한국시간 00~09시)에
// 실제 날짜보다 하루 전으로 표시되는 문제가 있어 사용하지 않음.

export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * "YYYY-MM-DD" 문자열 → 1970-01-01부터 며칠째인지(정수).
 * 문자열을 직접 파싱해서 계산하므로 시간대(timezone) 영향을 받지 않음.
 */
export function dateStrToDayNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 오늘 날짜의 일련번호 (dateStrToDayNumber와 같은 기준) */
export function todayDayNumber() {
  return dateStrToDayNumber(todayStr());
}
