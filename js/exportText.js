// exportText.js
// 역할: 지출 내역 배열을 클립보드 복사용 텍스트로 변환만 함. DOM이나 클립보드는 모름.

const WRITER_LABEL = { seonyeong: "선영", hyunwoo: "현우", gongyong: "공용" };
const METHOD_LABEL = { cash: "현금·체크카드", card: "신용카드" };

/**
 * entries: 기간으로 필터링된 지출 기록 배열
 * range: { start, end } ("YYYY-MM-DD")
 * totals: summary.js의 computeTotals(entries) 결과 (총액/현금/카드 요약용)
 */
export function buildEntriesText(entries, range, totals) {
  const lines = [];
  lines.push(`[단하네 가계부] ${range.start} ~ ${range.end} 지출 내역 (${entries.length}건)`);
  lines.push(`총 지출: ${totals.total.toLocaleString("ko-KR")}원 (현금·체크카드 ${totals.cash.toLocaleString("ko-KR")}원 / 신용카드 ${totals.card.toLocaleString("ko-KR")}원)`);
  lines.push("");
  lines.push("날짜 | 카테고리 | 금액(원) | 결제수단 | 작성자 | 메모");

  for (const e of entries) {
    const writerLabel = WRITER_LABEL[e.writer] ?? e.writer;
    const methodLabel = METHOD_LABEL[e.method] ?? e.method;
    lines.push(`${e.date} | ${e.category} | ${e.amount} | ${methodLabel} | ${writerLabel} | ${e.memo ?? ""}`);
  }

  return lines.join("\n");
}
