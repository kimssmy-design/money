// main.js
// 역할: 다른 모듈들을 연결하는 진입점. 여기서만 "무슨 일이 일어나면 무엇을 한다"를 결정.

import { addEntry, subscribeEntries } from "./db.js";
import { getPresetRange, filterByRange, computeTotals } from "./summary.js";
import { renderSummary, renderEntries, initForm, initRangeControl } from "./ui.js";

let allEntries = [];
let currentRange = getPresetRange("thisMonth");

function rerender() {
  const filtered = filterByRange(allEntries, currentRange.start, currentRange.end);
  renderSummary(computeTotals(filtered), currentRange);
  renderEntries(filtered);
}

// 기간 선택이 바뀌면 range를 다시 계산하고 화면 갱신
initRangeControl((choice) => {
  currentRange =
    choice.preset === "custom"
      ? { start: choice.start, end: choice.end }
      : getPresetRange(choice.preset);
  rerender();
});

// 입력 폼에서 저장이 필요할 때 Firestore에 실제로 저장
initForm(async (entry) => {
  await addEntry(entry);
  // 저장 후 화면은 subscribeEntries의 실시간 갱신이 알아서 처리함
});

// Firestore 데이터가 바뀔 때마다 (내가 쓰든, 남편이 쓰든) 실시간 반영
subscribeEntries((entries) => {
  allEntries = entries;
  rerender();
});

// PWA: 서비스워커 등록 (홈 화면 설치 가능하게 함)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("서비스워커 등록 실패:", err);
    });
  });
}
