// main.js
// 역할: 다른 모듈들을 연결하는 진입점. 여기서만 "무슨 일이 일어나면 무엇을 한다"를 결정.

import { addEntry, updateEntry, deleteEntry, subscribeEntries } from "./db.js";
import { getPresetRange, filterByRange, computeTotals } from "./summary.js";
import { renderSummary, renderEntries, initForm, initEntryList, initRangeControl, renderStreaks, showToast } from "./ui.js";
import { computeStreaks } from "./streak.js";
import { addTemplate, updateTemplate, deleteTemplate, subscribeTemplates } from "./fixedTemplates.js";
import { renderTemplates, initFixedUI } from "./fixedUI.js";

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

// 입력 폼에서 저장/수정이 필요할 때 Firestore에 실제로 반영
initForm({
  onSave: async (entry) => {
    await addEntry(entry);
  },
  onUpdate: async (id, entry) => {
    await updateEntry(id, entry);
  }
  // 저장/수정 후 화면은 subscribeEntries의 실시간 갱신이 알아서 처리함
});

// 내역 리스트에서 삭제 버튼 눌렀을 때
initEntryList({
  onDelete: async (id) => {
    await deleteEntry(id);
  }
});

// Firestore 데이터가 바뀔 때마다 (내가 쓰든, 남편이 쓰든) 실시간 반영
subscribeEntries(
  (entries) => {
    allEntries = entries;
    rerender();
    renderStreaks(computeStreaks(allEntries));
  },
  (err) => {
    console.error(err);
    showToast("데이터를 불러오지 못했어요 - 새로고침 해보세요");
  }
);

// 고정비 템플릿: 목록이 바뀔 때마다 화면 갱신
subscribeTemplates((templates) => {
  renderTemplates(templates);
});

// 고정비 화면(추가/수정/삭제/일괄등록) 초기화
initFixedUI({
  onSaveTemplate: async (id, template) => {
    if (id) {
      await updateTemplate(id, template);
    } else {
      await addTemplate(template);
    }
  },
  onDeleteTemplate: async (id) => {
    await deleteTemplate(id);
  },
  onRegisterEntries: async (entries) => {
    // 체크한 고정비 항목들을 실제 지출 기록으로 한 번에 저장
    for (const entry of entries) {
      await addEntry(entry);
    }
  }
});

// PWA: 서비스워커 등록 (홈 화면 설치 가능하게 함)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("서비스워커 등록 실패:", err);
    });
  });
}
